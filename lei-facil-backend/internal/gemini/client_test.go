package gemini_test

import (
	"bytes"
	"context"
	"io"
	"net/http"
	"strings"
	"testing"
	"github.com/Sofia-gith/LegislacaoFacil/lei-facil-backend/internal/gemini"
)

type mockHTTPDoer struct {
	statusCode int
	body       string
	err        error
}

func (m *mockHTTPDoer) Do(_ *http.Request) (*http.Response, error) {
	if m.err != nil {
		return nil, m.err
	}
	return &http.Response{
		StatusCode: m.statusCode,
		Body:       io.NopCloser(bytes.NewBufferString(m.body)),
	}, nil
}

const validResponse = `{
	"candidates": [{
		"content": {
			"parts": [{"text": "Todos têm os mesmos direitos."}]
		}
	}]
}`

const apiErrorResponse = `{
	"error": {
		"code": 400,
		"message": "API key not valid"
	}
}`

const emptyResponse = `{"candidates": []}`

func TestNewClient_EmptyKey(t *testing.T) {
	_, err := gemini.NewClient("")
	if err == nil {
		t.Error("expected error for empty api key, got nil")
	}
}

func TestNewClient_ValidKey(t *testing.T) {
	c, err := gemini.NewClient("fake-key-123")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if c == nil {
		t.Error("expected client, got nil")
	}
}

func TestNewClientWithHTTP_NilDoer(t *testing.T) {
	_, err := gemini.NewClientWithHTTP("fake-key", nil)
	if err == nil {
		t.Error("expected error for nil doer, got nil")
	}
}

func TestSimplify_EmptyText(t *testing.T) {
	c, _ := gemini.NewClientWithHTTP("fake-key-123", &mockHTTPDoer{statusCode: 200, body: validResponse})

	_, err := c.Simplify(context.Background(), "")
	if err == nil {
		t.Error("expected error for empty text, got nil")
	}
}

func TestSimplify_Success(t *testing.T) {
	c, _ := gemini.NewClientWithHTTP("fake-key-123", &mockHTTPDoer{
		statusCode: 200,
		body:       validResponse,
	})

	result, err := c.Simplify(context.Background(), "Art. 5° - todos são iguais perante a lei")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result != "Todos têm os mesmos direitos." {
		t.Errorf("unexpected result: %q", result)
	}
}

func TestSimplify_APIError(t *testing.T) {
	c, _ := gemini.NewClientWithHTTP("bad-key", &mockHTTPDoer{
		statusCode: 400,
		body:       apiErrorResponse,
	})

	_, err := c.Simplify(context.Background(), "algum texto")
	if err == nil {
		t.Error("expected error for api error response, got nil")
	}
	if !strings.Contains(err.Error(), "API key not valid") {
		t.Errorf("expected api key error message, got: %v", err)
	}
}

func TestSimplify_EmptyResponse(t *testing.T) {
	c, _ := gemini.NewClientWithHTTP("fake-key-123", &mockHTTPDoer{
		statusCode: 200,
		body:       emptyResponse,
	})

	_, err := c.Simplify(context.Background(), "algum texto")
	if err == nil {
		t.Error("expected error for empty candidates, got nil")
	}
}

func TestSimplify_HTTPError(t *testing.T) {
	c, _ := gemini.NewClientWithHTTP("fake-key-123", &mockHTTPDoer{
		err: io.ErrUnexpectedEOF,
	})

	_, err := c.Simplify(context.Background(), "algum texto")
	if err == nil {
		t.Error("expected error for http failure, got nil")
	}
}

func TestSimplify_InvalidJSON(t *testing.T) {
	c, _ := gemini.NewClientWithHTTP("fake-key-123", &mockHTTPDoer{
		statusCode: 200,
		body:       "not-json",
	})

	_, err := c.Simplify(context.Background(), "algum texto")
	if err == nil {
		t.Error("expected error for invalid json, got nil")
	}
}
