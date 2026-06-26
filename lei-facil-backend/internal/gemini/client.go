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
	"time"
)

const (
	apiURL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

	systemPrompt = `Você é um assistente de acessibilidade jurídica. 
Explique o trecho de lei abaixo em linguagem simples, clara e direta, 
como se estivesse explicando para alguém sem formação jurídica. 
Use frases curtas. Não invente informações além do que está escrito. 
Responda apenas com a explicação, sem introduções ou saudações.`
)

type HTTPDoer interface {
	Do(req *http.Request) (*http.Response, error)
}

type Client struct {
	apiKey     string
	httpClient HTTPDoer
}

func NewClient(apiKey string) (*Client, error) {
	if apiKey == "" {
		return nil, errors.New("gemini: api key is required")
	}
	return &Client{
		apiKey: apiKey,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
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
	if text == "" {
		return "", errors.New("gemini: text cannot be empty")
	}

	log.Printf("[Gemini] Iniciando simplificação - Tamanho do texto: %d caracteres", len(text))
	log.Printf("[Gemini] Texto enviado: %s...", truncateLog(text, 150))

	payload := geminiRequest{
		SystemInstruction: systemInstruction{
			Parts: []part{{Text: systemPrompt}},
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

	log.Printf("[Gemini] Payload criado - Tamanho: %d bytes", len(body))

	url := apiURL
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		log.Printf("[Gemini] Erro ao criar requisição HTTP: %v", err)
		return "", fmt.Errorf("gemini: failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-goog-api-key", "***REDACTED***")

	log.Printf("[Gemini] Enviando requisição para API Gemini...")
	resp, err := c.httpClient.Do(req)
	if err != nil {
		log.Printf("[Gemini] Erro na requisição HTTP: %v", err)
		return "", fmt.Errorf("gemini: http request failed: %w", err)
	}
	defer resp.Body.Close()

	log.Printf("[Gemini] Resposta recebida - Status Code: %d", resp.StatusCode)

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("[Gemini] Erro ao ler resposta: %v", err)
		return "", fmt.Errorf("gemini: failed to read response: %w", err)
	}

	log.Printf("[Gemini] Corpo da resposta - Tamanho: %d bytes", len(respBody))

	var gemResp geminiResponse
	if err := json.Unmarshal(respBody, &gemResp); err != nil {
		log.Printf("[Gemini] Erro ao decodificar resposta JSON: %v", err)
		log.Printf("[Gemini] Resposta bruta: %s", string(respBody))
		return "", fmt.Errorf("gemini: failed to decode response: %w", err)
	}

	if gemResp.Error != nil {
		log.Printf("[Gemini] Erro na API Gemini - Código: %d, Mensagem: %s", gemResp.Error.Code, gemResp.Error.Message)
		return "", fmt.Errorf("gemini: api error %d: %s", gemResp.Error.Code, gemResp.Error.Message)
	}

	if len(gemResp.Candidates) == 0 || len(gemResp.Candidates[0].Content.Parts) == 0 {
		log.Printf("[Gemini] Erro: Resposta vazia da API")
		return "", errors.New("gemini: empty response from api")
	}

	result := gemResp.Candidates[0].Content.Parts[0].Text
	log.Printf("[Gemini] Simplificação bem-sucedida - Tamanho do resultado: %d caracteres", len(result))
	log.Printf("[Gemini] Resultado: %s...", truncateLog(result, 150))

	return result, nil
}

func truncateLog(s string, maxLen int) string {
	if len(s) > maxLen {
		return s[:maxLen] + "..."
	}
	return s
}
