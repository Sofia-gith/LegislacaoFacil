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

	log.Printf("[Handler] Texto recebido - Tamanho: %d caracteres", len(req.Text))

	if req.Text == "" {
		log.Printf("[Handler] Erro: Texto vazio")
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "text is required"})
		return simplificarRequest{}, false
	}

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

// StatusHandler atende GET /status/{jobID} — não sabe nada sobre Gemini,
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