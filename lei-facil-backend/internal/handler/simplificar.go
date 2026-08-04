package handler

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"
	"github.com/Sofia-gith/LegislacaoFacil/lei-facil-backend/internal/jobstore"
)

// geminiCallTimeout é generoso porque não bloqueia mais nenhuma conexão HTTP
// esperando — é só o limite interno da goroutine de processamento.
const geminiCallTimeout = 150 * time.Second

const maxTextLength = 50000

type Simplifier interface {
	Simplify(ctx context.Context, text string) (string, error)
	SimplifyStructured(ctx context.Context, text string) (interface{}, error)
	AnalyzeImpact(ctx context.Context, text string) (interface{}, error)
}

type SimplificarHandler struct {
	gemini Simplifier
	jobs   jobstore.Store
}

type OQueMudaHandler struct {
	gemini Simplifier
	jobs   jobstore.Store
}

func NewSimplificarHandler(gemini Simplifier, jobs jobstore.Store) *SimplificarHandler {
	return &SimplificarHandler{gemini: gemini, jobs: jobs}
}

func NewOQueMudaHandler(gemini Simplifier, jobs jobstore.Store) *OQueMudaHandler {
	return &OQueMudaHandler{gemini: gemini, jobs: jobs}
}

type simplificarRequest struct {
	Text string `json:"text"`
}

type errorResponse struct {
	Error string `json:"error"`
}

// jobAceitoResponse é o corpo do 202 Accepted — o client faz polling
// em /status/{jobId} usando esse jobId.
type jobAceitoResponse struct {
	JobID  string `json:"jobId"`
	Status string `json:"status"`
}
// sanitizeText remove ruídos de formatação comuns em textos copiados de PDF/web
// (múltiplos espaços, quebras de linha excessivas, tabulações), reduzindo o uso de tokens.
func sanitizeText(input string) string {
	// 1. Substitui tabulações e retornos de carro por espaço simples
	cleaned := strings.ReplaceAll(input, "\r", "")
	cleaned = strings.ReplaceAll(cleaned, "\t", " ") // Usado '=' ao invés de ':='

	// 2. Normaliza quebras de linha consecutivas (mais de 2 vira 2 para manter a estrutura de parágrafos)
	for strings.Contains(cleaned, "\n\n\n") {
		cleaned = strings.ReplaceAll(cleaned, "\n\n\n", "\n\n")
	}

	// 3. Remove múltiplos espaços na mesma linha
	for strings.Contains(cleaned, "  ") {
		cleaned = strings.ReplaceAll(cleaned, "  ", " ")
	}

	// 4. Limpa espaços soltos em cada linha
	lines := strings.Split(cleaned, "\n")
	var sanitizedLines []string
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed != "" || len(sanitizedLines) > 0 { // evita linhas em branco no topo
			sanitizedLines = append(sanitizedLines, trimmed)
		}
	}

	return strings.Join(sanitizedLines, "\n")
}

// sanitizeJSONResponse corrige quebras de linha literais dentro de strings no JSON bruto da LLM
func sanitizeJSONResponse(rawJSON string) string {
	// Se o Gemini retornou markdown codeblocks como ```json ... ```, limpe primeiro
	cleaned := strings.TrimSpace(rawJSON)
	cleaned = strings.TrimPrefix(cleaned, "```json")
	cleaned = strings.TrimPrefix(cleaned, "```")
	cleaned = strings.TrimSuffix(cleaned, "```")
	cleaned = strings.TrimSpace(cleaned)

	// Substitui quebras de linha literais/reais que estejam soltas por "\n" escapado
	// Isso evita o erro 'invalid character \n in string literal'
	var builder strings.Builder
	inString := false
	escaped := false

	for _, r := range cleaned {
		switch r {
		case '"':
			if !escaped {
				inString = !inString
			}
			builder.WriteRune(r)
			escaped = false
		case '\\':
			escaped = !escaped
			builder.WriteRune(r)
		case '\n':
			if inString {
				// Se estamos DENTRO de uma string JSON, a quebra de linha física vira \n escapado
				builder.WriteString("\\n")
			} else {
				// Se estamos FORA de uma string JSON, mantém a quebra (separador de chaves/propriedades)
				builder.WriteRune(r)
			}
			escaped = false
		case '\r':
			// Ignora retornos de carro
			if !inString {
				builder.WriteRune(r)
			}
			escaped = false
		default:
			builder.WriteRune(r)
			escaped = false
		}
	}

	return builder.String()
}

func (h *SimplificarHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	log.Printf("[Handler] Requisição recebida - Método: %s, URL: %s", r.Method, r.RequestURI)

	req, ok := decodeAndValidate(w, r)
	if !ok {
		return
	}

	job, err := h.jobs.Create(jobstore.TypeSimplificar)
	if err != nil {
		log.Printf("[Handler] Erro ao criar job: %v", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "failed to create job"})
		return
	}

	go h.process(job.ID, req.Text)

	log.Printf("[Handler] Job aceito - ID: %s", job.ID)
	writeJSON(w, http.StatusAccepted, jobAceitoResponse{JobID: job.ID, Status: string(job.Status)})
}

func (h *SimplificarHandler) process(jobID, text string) {
	if err := h.jobs.SetProcessing(jobID); err != nil {
		log.Printf("[Handler] Erro ao marcar job como processando - ID: %s, Erro: %v", jobID, err)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), geminiCallTimeout)
	defer cancel()

	log.Printf("[Handler] Enviando para simplificação estruturada - Job: %s", jobID)
	result, err := h.gemini.SimplifyStructured(ctx, text)
	if err != nil {
		log.Printf("[Handler] Erro na simplificação - Job: %s, Erro: %v", jobID, err)
		h.jobs.SetError(jobID, err.Error())
		return
	}

	log.Printf("[Handler] Simplificação estruturada concluída - Job: %s", jobID)
	h.jobs.SetCompleted(jobID, result)
}

func (h *OQueMudaHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	log.Printf("[Handler] Requisição recebida - Método: %s, URL: %s", r.Method, r.RequestURI)

	req, ok := decodeAndValidate(w, r)
	if !ok {
		return
	}

	job, err := h.jobs.Create(jobstore.TypeOQueMuda)
	if err != nil {
		log.Printf("[Handler] Erro ao criar job: %v", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "failed to create job"})
		return
	}

	go h.process(job.ID, req.Text)

	log.Printf("[Handler] Job aceito - ID: %s", job.ID)
	writeJSON(w, http.StatusAccepted, jobAceitoResponse{JobID: job.ID, Status: string(job.Status)})
}

func (h *OQueMudaHandler) process(jobID, text string) {
	if err := h.jobs.SetProcessing(jobID); err != nil {
		log.Printf("[Handler] Erro ao marcar job como processando - ID: %s, Erro: %v", jobID, err)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), geminiCallTimeout)
	defer cancel()

	log.Printf("[Handler] Analisando impacto - Job: %s", jobID)
	result, err := h.gemini.AnalyzeImpact(ctx, text)
	if err != nil {
		log.Printf("[Handler] Erro na análise - Job: %s, Erro: %v", jobID, err)
		h.jobs.SetError(jobID, err.Error())
		return
	}

	log.Printf("[Handler] Análise de impacto concluída - Job: %s", jobID)
	h.jobs.SetCompleted(jobID, result)
}

// decodeAndValidate concentra a validação que era duplicada nos dois handlers
// (método, JSON, texto vazio, tamanho máximo). Escreve a resposta de erro
// e devolve ok=false quando a requisição não pode prosseguir.
func decodeAndValidate(w http.ResponseWriter, r *http.Request) (simplificarRequest, bool) {
	if r.Method != http.MethodPost {
		log.Printf("[Handler] Erro: Método não permitido: %s", r.Method)
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		return simplificarRequest{}, false
	}

	var req simplificarRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("[Handler] Erro ao decodificar JSON: %v", err)
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid json"})
		return simplificarRequest{}, false
	}

	tamanhoOriginal := len(req.Text)

	// --- APLICA A LIMPEZA / SANITIZAÇÃO AQUI ---
	req.Text = sanitizeText(req.Text)
	tamanhoLimpo := len(req.Text)

	log.Printf("[Handler] Texto recebido - Original: %d caracteres | Após Limpeza: %d caracteres (Economia: %d chars)", 
		tamanhoOriginal, tamanhoLimpo, tamanhoOriginal-tamanhoLimpo)

	if req.Text == "" {
		log.Printf("[Handler] Erro: Texto vazio")
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "text is required"})
		return simplificarRequest{}, false
	}

	// A validação agora mede o tamanho com o texto já reduzido e higienizado
	if len(req.Text) > maxTextLength {
		log.Printf("[Handler] Erro: Texto excede o tamanho máximo (%d > %d)", len(req.Text), maxTextLength)
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "text exceeds maximum length of 50000 characters"})
		return simplificarRequest{}, false
	}

	return req, true
}
func writeJSON(w http.ResponseWriter, status int, body interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(body)
}


// só consulta o JobStore. Um único endpoint serve tanto /simplificar
// quanto /o-que-muda porque o próprio Job já guarda seu Type.
type StatusHandler struct {
	jobs jobstore.Store
}

func NewStatusHandler(jobs jobstore.Store) *StatusHandler {
	return &StatusHandler{jobs: jobs}
}

func (h *StatusHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		return
	}

	jobID := strings.TrimPrefix(r.URL.Path, "/status/")
	jobID = strings.Trim(jobID, "/")
	if jobID == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "job id is required"})
		return
	}

	job, err := h.jobs.Get(jobID)
	if err != nil {
		if err == jobstore.ErrJobNotFound {
			writeJSON(w, http.StatusNotFound, errorResponse{Error: "job not found"})
			return
		}
		log.Printf("[Handler] Erro ao consultar job - ID: %s, Erro: %v", jobID, err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "failed to get job status"})
		return
	}

	writeJSON(w, http.StatusOK, job)
}