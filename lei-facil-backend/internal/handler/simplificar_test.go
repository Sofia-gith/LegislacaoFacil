package handler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Sofia-gith/LegislacaoFacil/lei-facil-backend/internal/handler"
)

type mockSimplifier struct {
	result            interface{}
	simplifyErr       error
	structuredErr     error
	analyzeImpactErr  error
}

func (m *mockSimplifier) Simplify(_ context.Context, _ string) (string, error) {
	if str, ok := m.result.(string); ok {
		return str, m.simplifyErr
	}
	return "", m.simplifyErr
}

func (m *mockSimplifier) SimplifyStructured(_ context.Context, _ string) (interface{}, error) {
	return m.result, m.structuredErr
}

func (m *mockSimplifier) AnalyzeImpact(_ context.Context, _ string) (interface{}, error) {
	return m.result, m.analyzeImpactErr
}

func TestSimplificarHandler_MethodNotAllowed(t *testing.T) {
	h := handler.NewSimplificarHandler(&mockSimplifier{})

	req := httptest.NewRequest(http.MethodGet, "/simplificar", nil)
	rec := httptest.NewRecorder()

	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405, got %d", rec.Code)
	}
}

func TestSimplificarHandler_InvalidJSON(t *testing.T) {
	h := handler.NewSimplificarHandler(&mockSimplifier{})

	req := httptest.NewRequest(http.MethodPost, "/simplificar", bytes.NewBufferString("not-json"))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rec.Code)
	}
}

func TestSimplificarHandler_EmptyText(t *testing.T) {
	h := handler.NewSimplificarHandler(&mockSimplifier{})

	body, _ := json.Marshal(map[string]string{"text": ""})
	req := httptest.NewRequest(http.MethodPost, "/simplificar", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rec.Code)
	}
}

func TestSimplificarHandler_GeminiError(t *testing.T) {
	h := handler.NewSimplificarHandler(&mockSimplifier{structuredErr: context.DeadlineExceeded})

	body, _ := json.Marshal(map[string]string{"text": "Art. 5° - todos são iguais perante a lei"})
	req := httptest.NewRequest(http.MethodPost, "/simplificar", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", rec.Code)
	}
}

func TestSimplificarHandler_Success(t *testing.T) {
	expectedResp := map[string]interface{}{
		"resumo": "Todos têm os mesmos direitos.",
		"corpo":  "Ninguém pode ser discriminado.",
		"pontos": []string{"Igualdade perante a lei", "Sem discriminação"},
	}
	h := handler.NewSimplificarHandler(&mockSimplifier{result: expectedResp})

	body, _ := json.Marshal(map[string]string{"text": "Art. 5° - todos são iguais perante a lei"})
	req := httptest.NewRequest(http.MethodPost, "/simplificar", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}

	var resp map[string]interface{}
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp["resumo"] != "Todos têm os mesmos direitos." {
		t.Errorf("expected resumo %q, got %q", "Todos têm os mesmos direitos.", resp["resumo"])
	}
}
