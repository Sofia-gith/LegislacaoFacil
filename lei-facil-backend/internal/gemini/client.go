package gemini

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
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
		apiKey:     apiKey,
		httpClient: &http.Client{},
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
		return "", fmt.Errorf("gemini: failed to encode request: %w", err)
	}

	url := apiURL
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("gemini: failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-goog-api-key", c.apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("gemini: http request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("gemini: failed to read response: %w", err)
	}

	var gemResp geminiResponse
	if err := json.Unmarshal(respBody, &gemResp); err != nil {
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
