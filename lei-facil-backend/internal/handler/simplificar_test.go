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
	result string
	err    error
}

func (m *mockSimplifier) Simplify(_ context.Context, _ string) (string, error) {
	return m.result, m.err
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
	h := handler.NewSimplificarHandler(&mockSimplifier{err: context.DeadlineExceeded})

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
	expected := "Todos têm os mesmos direitos."
	h := handler.NewSimplificarHandler(&mockSimplifier{result: expected})

	body, _ := json.Marshal(map[string]string{"text": "Art. 5° - todos são iguais perante a lei"})
	req := httptest.NewRequest(http.MethodPost, "/simplificar", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}

	var resp map[string]string
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp["texto_simplificado"] != expected {
		t.Errorf("expected result %q, got %q", expected, resp["texto_simplificado"])
	}
}
