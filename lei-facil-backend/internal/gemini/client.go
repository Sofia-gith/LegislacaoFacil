package gemini

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
)

const (
	apiURL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

	systemPrompt = `Você é um assistente de acessibilidade jurídica.

            Sua tarefa: reescrever o texto legal abaixo para um adulto sem formação
            jurídica — não simplifique o raciocínio, simplifique o vocabulário e a estrutura.

            REGRAS DE CONTEÚDO:
            - Não omita nenhuma informação factual: datas, números de lei, valores, prazos,
              URLs e nomes próprios devem ser preservados exatamente como no original.
            - URLs e referências a leis/decretos devem ser mantidos por extenso, nunca resumidos 
              como "um endereço específico" ou "uma lei municipal".
            - Quando um termo técnico não tiver equivalente simples (ex: "regimento interno", "plano plurianual"),
              mantenha o termo e explique em poucas palavras o que ele significa, entre parênteses ou em aposto.

            REGRAS DE ESTILO:
            - Varie o tamanho das frases. Frases curtas demais em sequência são tão difíceis de ler quanto frases longas — 
              conecte ideias relacionadas com conectivos simples (e, por isso, para isso, já que).
            - Quando o texto original encadear múltiplas leis, decretos ou alterações em uma única frase longa
              (ex: "Lei X, regulamentada por Y, alterada por Z, regulamentada por W"), quebre essa cadeia em uma
              lista curta, mantendo a ordem cronológica e a relação entre cada lei e o decreto/alteração
              correspondente. Não crie uma seção separada para isso — mantenha no fluxo natural do texto,
              no mesmo ponto em que a informação aparece no original.
            - Comece com um resumo de 1-2 frases: o que é o documento e o que ele decide, antes de entrar em detalhes.
            - Use listas (bullets) para enumerar itens que no original aparecem como uma sequência (considerandos, artigos, condições).
            - Não use jargão jurídico desnecessário, mas também não infantilize o tom — o leitor é um adulto capaz, só não é advogado.

            Responda apenas com o texto reescrito, sem introduções ou saudações.`

	structuredPrompt = `Você é um assistente de acessibilidade jurídica.

            Sua tarefa: reescrever o texto legal abaixo para um adulto sem formação jurídica — não simplifique o raciocínio, simplifique o vocabulário e a estrutura.

            REGRAS DE CONTEÚDO:
            - Não omita nenhuma informação factual: datas, números de lei, valores, prazos, URLs e nomes próprios devem ser preservados exatamente como no original.
            - URLs e referências a leis/decretos devem ser mantidos por extenso, nunca resumidos como "um endereço específico" ou "uma lei municipal".
            - Quando um termo técnico não tiver equivalente simples, mantenha o termo e explique em poucas palavras entre parênteses.

            REGRAS DE ESTILO:
            - Varie o tamanho das frases. Frases curtas demais em sequência são tão difíceis de ler quanto frases longas.
            - Quando o texto original encadear múltiplas leis, quebre essa cadeia em uma lista curta, mantendo a ordem cronológica.
            - Comece com um resumo de 1-2 frases: o que é o documento e o que ele decide, antes de entrar em detalhes.
            - Use listas (bullets) para enumerar itens que aparecem como uma sequência.
            - Não use jargão jurídico desnecessário, mas também não infantilize o tom.

            Responda em JSON estruturado (APENAS JSON VÁLIDO, sem markdown ou codeblocks) com exatamente esta estrutura:
            {
              "resumo": "1-2 frases explicando o que é o documento e o que ele decide",
              "corpo": "Explicação detalhada em linguagem simples, mantendo toda informação factual, com bullets quando apropriado",
              "pontos": ["Ponto principal 1", "Ponto principal 2", "Ponto principal 3"]
            }

            Garanta que cada campo seja uma string válida sem quebras de linha não escapadas. O campo pontos é um array de 3-5 strings.`

	oQueMudaPrompt = `Você é um assistente de acessibilidade jurídica especializado em análise de impacto.

            Sua tarefa: explicar de forma simples e clara como o texto legal abaixo pode afetar a vida de uma pessoa comum (morador, cidadão).

            REGRAS:
            - Focar apenas no impacto prático e direto para o dia a dia de um cidadão comum.
            - Preservar informações factais importantes (datas, números, prazos).
            - Usar linguagem simples, sem jargão jurídico desnecessário.
            - Estruturar em: o que muda (resumo) e como afeta você (detalhes).

            Responda em JSON estruturado (APENAS JSON VÁLIDO, sem markdown ou codeblocks) com exatamente esta estrutura:
            {
              "resumo": "1-2 frases explicando como isso afeta uma pessoa comum",
              "corpo": "Detalhes práticos de como a lei muda o dia a dia, com exemplos quando possível"
            }`
)

type HTTPDoer interface {
	Do(req *http.Request) (*http.Response, error)
}

type Client struct {
	apiKey     string
	httpClient HTTPDoer
}

type StructuredResponse struct {
	Resumo string   `json:"resumo"`
	Corpo  string   `json:"corpo"`
	Pontos []string `json:"pontos,omitempty"`
}

func NewClient(apiKey string) (*Client, error) {
	if apiKey == "" {
		return nil, errors.New("gemini: api key is required")
	}
	return &Client{
		apiKey: apiKey,
		httpClient: &http.Client{
			Timeout: 150 * time.Second,
		},
	}, nil
}

func NewClientWithHTTP(apiKey string, doer HTTPDoer) (*Client, error) {
	if apiKey == "" {
		return nil, errors.New("gemini: api key is required")
	}
	if doer == nil {
		return nil, errors.New("gemini: http doer is required")
	}
	return &Client{apiKey: apiKey, httpClient: doer}, nil
}

type geminiRequest struct {
	SystemInstruction systemInstruction `json:"system_instruction"`
	Contents          []content         `json:"contents"`
}

type systemInstruction struct {
	Parts []part `json:"parts"`
}

type content struct {
	Parts []part `json:"parts"`
}

type part struct {
	Text string `json:"text"`
}

type geminiResponse struct {
	Candidates []candidate `json:"candidates"`
	Error      *apiError   `json:"error,omitempty"`
}

type candidate struct {
	Content content `json:"content"`
}

type apiError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

func (c *Client) Simplify(ctx context.Context, text string) (string, error) {
	log.Printf("[Gemini] Texto enviado: %s...", truncateLog(text, 150))

	result, err := c.callGemini(ctx, systemPrompt, text, "simplificação")
	if err != nil {
		return "", err
	}
	return result, nil
}

func (c *Client) SimplifyStructured(ctx context.Context, text string) (interface{}, error) {
	structured, err := c.callGeminiStructured(ctx, structuredPrompt, text, "simplificação estruturada", "structured")
	if err != nil {
		return nil, err
	}
	log.Println("[Gemini] Simplificação estruturada bem-sucedida")
	return structured, nil
}

func (c *Client) AnalyzeImpact(ctx context.Context, text string) (interface{}, error) {
	structured, err := c.callGeminiStructured(ctx, oQueMudaPrompt, text, "análise de impacto", "impact")
	if err != nil {
		return nil, err
	}
	log.Println("[Gemini] Análise de impacto bem-sucedida")
	return structured, nil
}

// callGemini concentra a chamada HTTP crua à API do Gemini — montar payload,
// enviar, ler e validar a resposta — usada por Simplify, SimplifyStructured
// e AnalyzeImpact, que só variam no prompt de sistema enviado e no que fazem
// com o texto retornado. logLabel é usado só nas mensagens de log (em pt-br).
func (c *Client) callGemini(ctx context.Context, promptToUse, text, logLabel string) (string, error) {
	if text == "" {
		return "", errors.New("gemini: text cannot be empty")
	}

	log.Printf("[Gemini] Iniciando %s - Tamanho do texto: %d caracteres", logLabel, len(text))

	payload := geminiRequest{
		SystemInstruction: systemInstruction{
			Parts: []part{{Text: promptToUse}},
		},
		Contents: []content{
			{Parts: []part{{Text: text}}},
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		log.Printf("[Gemini] Erro ao encodar payload: %v", err)
		return "", fmt.Errorf("gemini: failed to encode request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, apiURL, bytes.NewReader(body))
	if err != nil {
		log.Printf("[Gemini] Erro ao criar requisição HTTP: %v", err)
		return "", fmt.Errorf("gemini: failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-goog-api-key", c.apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		log.Printf("[Gemini] Erro na requisição HTTP: %v", err)
		return "", fmt.Errorf("gemini: http request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("[Gemini] Erro ao ler resposta: %v", err)
		return "", fmt.Errorf("gemini: failed to read response: %w", err)
	}

	var gemResp geminiResponse
	if err := json.Unmarshal(respBody, &gemResp); err != nil {
		log.Printf("[Gemini] Erro ao decodificar resposta JSON: %v", err)
		return "", fmt.Errorf("gemini: failed to decode response: %w", err)
	}

	if gemResp.Error != nil {
		return "", fmt.Errorf("gemini: api error %d: %s", gemResp.Error.Code, gemResp.Error.Message)
	}

	if len(gemResp.Candidates) == 0 || len(gemResp.Candidates[0].Content.Parts) == 0 {
		return "", errors.New("gemini: empty response from api")
	}

	return gemResp.Candidates[0].Content.Parts[0].Text, nil
}

// callGeminiStructured chama callGemini e faz o pós-processamento comum a
// SimplifyStructured e AnalyzeImpact: limpar o JSON bruto devolvido pela LLM
// e decodificar em StructuredResponse. errKind entra só na mensagem de erro,
// pra manter o texto de erro igual ao que cada método tinha antes da junção
// ("structured" / "impact").
func (c *Client) callGeminiStructured(ctx context.Context, promptToUse, text, logLabel, errKind string) (*StructuredResponse, error) {
	resultText, err := c.callGemini(ctx, promptToUse, text, logLabel)
	if err != nil {
		return nil, err
	}

	log.Printf("[Gemini] Resposta recebida - Tamanho: %d caracteres", len(resultText))

	// Aplica a limpeza que remove blocos de código e escapa quebras de linha internas
	cleanJSON := sanitizeJSONResponse(resultText)

	var structured StructuredResponse
	if err := json.Unmarshal([]byte(cleanJSON), &structured); err != nil {
		log.Printf("[Gemini] Erro ao parsejar JSON de %s: %v", logLabel, err)
		log.Printf("[Gemini] Texto limpo enviado pro parse: %s", cleanJSON)
		return nil, fmt.Errorf("gemini: failed to parse %s response: %w", errKind, err)
	}

	return &structured, nil
}

func sanitizeJSONResponse(rawJSON string) string {
	cleaned := strings.TrimSpace(rawJSON)
	cleaned = strings.TrimPrefix(cleaned, "```json")
	cleaned = strings.TrimPrefix(cleaned, "```")
	cleaned = strings.TrimSuffix(cleaned, "```")
	cleaned = strings.TrimSpace(cleaned)

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
				builder.WriteString("\\n")
			} else {
				builder.WriteRune(r)
			}
			escaped = false
		case '\r':
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

func truncateLog(s string, maxLen int) string {
	if len(s) > maxLen {
		return s[:maxLen] + "..."
	}
	return s
}