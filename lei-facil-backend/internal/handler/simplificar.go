package handler

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
)

type Simplifier interface {
	Simplify(ctx context.Context, text string) (string, error)
}

type SimplificarHandler struct {
	gemini Simplifier
}

func NewSimplificarHandler(gemini Simplifier) *SimplificarHandler {
	return &SimplificarHandler{gemini: gemini}
}

type simplificarRequest struct {
	Text string `json:"text"`
}

type simplificarResponse struct {
	TextoSimplificado string `json:"texto_simplificado"`
}

type errorResponse struct {
	Error string `json:"error"`
}

func (h *SimplificarHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	log.Printf("[Handler] Requisição recebida - Método: %s, URL: %s", r.Method, r.RequestURI)

	if r.Method != http.MethodPost {
		log.Printf("[Handler] Erro: Método não permitido: %s", r.Method)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(errorResponse{Error: "method not allowed"})
		return
	}

	var req simplificarRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("[Handler] Erro ao decodificar JSON: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(errorResponse{Error: "invalid json"})
		return
	}

	log.Printf("[Handler] Texto recebido - Tamanho: %d caracteres", len(req.Text))
	log.Printf("[Handler] Texto completo:\n%s", req.Text)

	if req.Text == "" {
		log.Printf("[Handler] Erro: Texto vazio")
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(errorResponse{Error: "text is required"})
		return
	}

	const maxTextLength = 50000
	if len(req.Text) > maxTextLength {
		log.Printf("[Handler] Erro: Texto excede o tamanho máximo (%d > %d)", len(req.Text), maxTextLength)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(errorResponse{Error: "text exceeds maximum length of 50000 characters"})
		return
	}

	log.Printf("[Handler] Enviando para simplificação...")
	result, err := h.gemini.Simplify(r.Context(), req.Text)
	if err != nil {
		log.Printf("[Handler] Erro na simplificação: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(errorResponse{Error: err.Error()})
		return
	}

	log.Printf("[Handler] Simplificação concluída - Tamanho da resposta: %d caracteres", len(result))
	log.Printf("[Handler] Resposta: %s...", truncate(result, 100))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(simplificarResponse{TextoSimplificado: result})
	log.Printf("[Handler] Resposta enviada com sucesso")
}

func truncate(s string, maxLen int) string {
	if len(s) > maxLen {
		return s[:maxLen] + "..."
	}
	return s
}
