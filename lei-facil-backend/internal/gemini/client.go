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
	req.Header.Set("x-goog-api-key", c.apiKey)

	log.Printf("[Gemini] Enviando requisição para API Gemini...")
	resp, err := c.httpClient.Do(req)
	if err != nil {
		log.Printf("[Gemini] Erro na requisição HTTP: %v", err)
		return "", fmt.Errorf("gemini: http request failed: %w", err)
	}
	defer resp.Body.Close()

	log.Printf("API Key: %.12s...", c.apiKey)
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
