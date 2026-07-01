package deepseek

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
	apiURL = "https://api.deepseek.com/chat/completions"

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
		return nil, errors.New("deepseek: api key is required")
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
		return nil, errors.New("deepseek: api key is required")
	}
	if doer == nil {
		return nil, errors.New("deepseek: http doer is required")
	}
	return &Client{apiKey: apiKey, httpClient: doer}, nil
}

type deepseekRequest struct {
	Model    string        `json:"model"`
	Messages []message     `json:"messages"`
}

type message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type deepseekResponse struct {
	Choices []choice `json:"choices"`
	Error   *apiError `json:"error,omitempty"`
}

type choice struct {
	Message message `json:"message"`
}

type apiError struct {
	Type    string `json:"type"`
	Message string `json:"message"`
}

func (c *Client) Simplify(ctx context.Context, text string) (string, error) {
	if text == "" {
		return "", errors.New("deepseek: text cannot be empty")
	}

	log.Printf("[DeepSeek] Iniciando simplificação - Tamanho do texto: %d caracteres", len(text))
	log.Printf("[DeepSeek] Texto enviado: %s...", truncateLog(text, 150))

	payload := deepseekRequest{
		Model: "deepseek-chat",
		Messages: []message{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: text},
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		log.Printf("[DeepSeek] Erro ao encodar payload: %v", err)
		return "", fmt.Errorf("deepseek: failed to encode request: %w", err)
	}

	log.Printf("[DeepSeek] Payload criado - Tamanho: %d bytes", len(body))

	url := apiURL
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		log.Printf("[DeepSeek] Erro ao criar requisição HTTP: %v", err)
		return "", fmt.Errorf("deepseek: failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.apiKey))

	log.Printf("[DeepSeek] Enviando requisição para API DeepSeek...")
	resp, err := c.httpClient.Do(req)
	if err != nil {
		log.Printf("[DeepSeek] Erro na requisição HTTP: %v", err)
		return "", fmt.Errorf("deepseek: http request failed: %w", err)
	}
	defer resp.Body.Close()

	log.Printf("[DeepSeek] Resposta recebida - Status Code: %d", resp.StatusCode)

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("[DeepSeek] Erro ao ler resposta: %v", err)
		return "", fmt.Errorf("deepseek: failed to read response: %w", err)
	}

	log.Printf("[DeepSeek] Corpo da resposta - Tamanho: %d bytes", len(respBody))

	var dsResp deepseekResponse
	if err := json.Unmarshal(respBody, &dsResp); err != nil {
		log.Printf("[DeepSeek] Erro ao decodificar resposta JSON: %v", err)
		log.Printf("[DeepSeek] Resposta bruta: %s", string(respBody))
		return "", fmt.Errorf("deepseek: failed to decode response: %w", err)
	}

	if dsResp.Error != nil {
		log.Printf("[DeepSeek] Erro na API DeepSeek - Tipo: %s, Mensagem: %s", dsResp.Error.Type, dsResp.Error.Message)
		return "", fmt.Errorf("deepseek: api error: %s", dsResp.Error.Message)
	}

	if len(dsResp.Choices) == 0 {
		log.Printf("[DeepSeek] Erro: Resposta vazia da API")
		return "", errors.New("deepseek: empty response from api")
	}

	result := dsResp.Choices[0].Message.Content
	log.Printf("[DeepSeek] Simplificação bem-sucedida - Tamanho do resultado: %d caracteres", len(result))
	log.Printf("[DeepSeek] Resultado: %s...", truncateLog(result, 150))

	return result, nil
}

func truncateLog(s string, maxLen int) string {
	if len(s) > maxLen {
		return s[:maxLen] + "..."
	}
	return s
}
