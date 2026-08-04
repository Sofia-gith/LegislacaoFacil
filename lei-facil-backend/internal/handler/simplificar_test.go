package handler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/Sofia-gith/LegislacaoFacil/lei-facil-backend/internal/handler"
	"github.com/Sofia-gith/LegislacaoFacil/lei-facil-backend/internal/jobstore"
)

type mockSimplifier struct {
	result           interface{}
	simplifyErr      error
	structuredErr    error
	analyzeImpactErr error
	delay            time.Duration
}

func (m *mockSimplifier) Simplify(_ context.Context, _ string) (string, error) {
	if str, ok := m.result.(string); ok {
		return str, m.simplifyErr
	}
	return "", m.simplifyErr
}

func (m *mockSimplifier) SimplifyStructured(_ context.Context, _ string) (interface{}, error) {
	if m.delay > 0 {
		time.Sleep(m.delay)
	}
	return m.result, m.structuredErr
}

func (m *mockSimplifier) AnalyzeImpact(_ context.Context, _ string) (interface{}, error) {
	if m.delay > 0 {
		time.Sleep(m.delay)
	}
	return m.result, m.analyzeImpactErr
}

// waitForJob faz polling no store até o job sair de pendente/processando,
// simulando o que o client (background.ts) faz de verdade.
func waitForJob(t *testing.T, store jobstore.Store, jobID string) *jobstore.Job {
	t.Helper()

	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		job, err := store.Get(jobID)
		if err != nil {
			t.Fatalf("expected job to exist, got error: %v", err)
		}
		if job.Status == jobstore.StatusConcluido || job.Status == jobstore.StatusErro {
			return job
		}
		time.Sleep(5 * time.Millisecond)
	}
	t.Fatal("timed out waiting for job to finish")
	return nil
}

func TestSimplificarHandler_MethodNotAllowed(t *testing.T) {
	store := jobstore.NewInMemoryStore()
	h := handler.NewSimplificarHandler(&mockSimplifier{}, store)

	req := httptest.NewRequest(http.MethodGet, "/simplificar", nil)
	rec := httptest.NewRecorder()

	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405, got %d", rec.Code)
	}
}

func TestSimplificarHandler_InvalidJSON(t *testing.T) {
	store := jobstore.NewInMemoryStore()
	h := handler.NewSimplificarHandler(&mockSimplifier{}, store)

	req := httptest.NewRequest(http.MethodPost, "/simplificar", bytes.NewBufferString("not-json"))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rec.Code)
	}
}

func TestSimplificarHandler_EmptyText(t *testing.T) {
	store := jobstore.NewInMemoryStore()
	h := handler.NewSimplificarHandler(&mockSimplifier{}, store)

	body, _ := json.Marshal(map[string]string{"text": ""})
	req := httptest.NewRequest(http.MethodPost, "/simplificar", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rec.Code)
	}
}

func TestSimplificarHandler_AcceptsAndReturnsJobID(t *testing.T) {
	store := jobstore.NewInMemoryStore()
	h := handler.NewSimplificarHandler(&mockSimplifier{result: "qualquer coisa"}, store)

	body, _ := json.Marshal(map[string]string{"text": "Art. 5° - todos são iguais perante a lei"})
	req := httptest.NewRequest(http.MethodPost, "/simplificar", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusAccepted {
		t.Fatalf("expected 202, got %d", rec.Code)
	}

	var resp map[string]string
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp["jobId"] == "" {
		t.Error("expected non-empty jobId")
	}
}

func TestSimplificarHandler_JobExistsBeforeResponseReturns(t *testing.T) {
	// Garante que não existe a janela onde o client recebe o jobID
	// mas o job ainda não existe no store.
	store := jobstore.NewInMemoryStore()
	h := handler.NewSimplificarHandler(&mockSimplifier{result: "ok"}, store)

	body, _ := json.Marshal(map[string]string{"text": "Art. 5°"})
	req := httptest.NewRequest(http.MethodPost, "/simplificar", bytes.NewBuffer(body))
	rec := httptest.NewRecorder()

	h.ServeHTTP(rec, req)

	var resp map[string]string
	json.NewDecoder(rec.Body).Decode(&resp)

	if _, err := store.Get(resp["jobId"]); err != nil {
		t.Errorf("expected job to already exist in store, got error: %v", err)
	}
}

func TestSimplificarHandler_GeminiError_MarksJobAsError(t *testing.T) {
	store := jobstore.NewInMemoryStore()
	h := handler.NewSimplificarHandler(&mockSimplifier{structuredErr: context.DeadlineExceeded}, store)

	body, _ := json.Marshal(map[string]string{"text": "Art. 5° - todos são iguais perante a lei"})
	req := httptest.NewRequest(http.MethodPost, "/simplificar", bytes.NewBuffer(body))
	rec := httptest.NewRecorder()

	h.ServeHTTP(rec, req)

	var resp map[string]string
	json.NewDecoder(rec.Body).Decode(&resp)

	job := waitForJob(t, store, resp["jobId"])
	if job.Status != jobstore.StatusErro {
		t.Errorf("expected status erro, got %s", job.Status)
	}
}

func TestSimplificarHandler_Success_JobEndsCompletedWithResult(t *testing.T) {
	expectedResp := map[string]interface{}{
		"resumo": "Todos têm os mesmos direitos.",
		"corpo":  "Ninguém pode ser discriminado.",
		"pontos": []string{"Igualdade perante a lei", "Sem discriminação"},
	}
	store := jobstore.NewInMemoryStore()
	h := handler.NewSimplificarHandler(&mockSimplifier{result: expectedResp}, store)

	body, _ := json.Marshal(map[string]string{"text": "Art. 5° - todos são iguais perante a lei"})
	req := httptest.NewRequest(http.MethodPost, "/simplificar", bytes.NewBuffer(body))
	rec := httptest.NewRecorder()

	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusAccepted {
		t.Fatalf("expected 202, got %d", rec.Code)
	}

	var resp map[string]string
	json.NewDecoder(rec.Body).Decode(&resp)

	job := waitForJob(t, store, resp["jobId"])
	if job.Status != jobstore.StatusConcluido {
		t.Fatalf("expected status concluido, got %s", job.Status)
	}

	result, ok := job.Result.(map[string]interface{})
	if !ok {
		t.Fatalf("expected result to be a map, got %T", job.Result)
	}
	if result["resumo"] != "Todos têm os mesmos direitos." {
		t.Errorf("expected resumo %q, got %q", "Todos têm os mesmos direitos.", result["resumo"])
	}
}

func TestSimplificarHandler_SlowGemini_DoesNotBlockResponse(t *testing.T) {
	// A chamada ao Gemini "demora" mais que um handler síncrono aceitaria,
	// mas o ServeHTTP deve responder quase imediatamente.
	store := jobstore.NewInMemoryStore()
	h := handler.NewSimplificarHandler(&mockSimplifier{result: "ok", delay: 150 * time.Millisecond}, store)

	body, _ := json.Marshal(map[string]string{"text": "texto longo simulando 27000 caracteres"})
	req := httptest.NewRequest(http.MethodPost, "/simplificar", bytes.NewBuffer(body))
	rec := httptest.NewRecorder()

	start := time.Now()
	h.ServeHTTP(rec, req)
	elapsed := time.Since(start)

	if elapsed > 50*time.Millisecond {
		t.Errorf("expected handler to respond immediately, took %v", elapsed)
	}
	if rec.Code != http.StatusAccepted {
		t.Errorf("expected 202, got %d", rec.Code)
	}
}

func TestStatusHandler_JobNotFound(t *testing.T) {
	store := jobstore.NewInMemoryStore()
	h := handler.NewStatusHandler(store)

	req := httptest.NewRequest(http.MethodGet, "/status/id-inexistente", nil)
	rec := httptest.NewRecorder()

	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", rec.Code)
	}
}

func TestStatusHandler_MissingJobID(t *testing.T) {
	store := jobstore.NewInMemoryStore()
	h := handler.NewStatusHandler(store)

	req := httptest.NewRequest(http.MethodGet, "/status/", nil)
	rec := httptest.NewRecorder()

	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rec.Code)
	}
}

func TestStatusHandler_MethodNotAllowed(t *testing.T) {
	store := jobstore.NewInMemoryStore()
	h := handler.NewStatusHandler(store)

	req := httptest.NewRequest(http.MethodPost, "/status/algum-id", nil)
	rec := httptest.NewRecorder()

	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405, got %d", rec.Code)
	}
}

func TestStatusHandler_ReturnsCurrentJobState(t *testing.T) {
	store := jobstore.NewInMemoryStore()
	job, _ := store.Create(jobstore.TypeSimplificar)
	store.SetCompleted(job.ID, map[string]string{"resumo": "teste"})

	h := handler.NewStatusHandler(store)

	req := httptest.NewRequest(http.MethodGet, "/status/"+job.ID, nil)
	rec := httptest.NewRecorder()

	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	var resp jobstore.Job
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp.Status != jobstore.StatusConcluido {
		t.Errorf("expected status concluido, got %s", resp.Status)
	}
}