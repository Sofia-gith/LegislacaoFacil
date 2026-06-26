package handler

import (
	"context"
	"encoding/json"
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
	Result string `json:"result"`
}

type errorResponse struct {
	Error string `json:"error"`
}

func (h *SimplificarHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(errorResponse{Error: "method not allowed"})
		return
	}

	var req simplificarRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(errorResponse{Error: "invalid json"})
		return
	}

	if req.Text == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(errorResponse{Error: "text is required"})
		return
	}

	result, err := h.gemini.Simplify(r.Context(), req.Text)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(errorResponse{Error: err.Error()})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(simplificarResponse{Result: result})
}
