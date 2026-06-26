package gemini_test

import (
	"context"
	"testing"

	"github.com/Sofia-gith/LegislacaoFacil/lei-facil-backend/internal/gemini"
)

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

func TestSimplify_EmptyText(t *testing.T) {
	c, _ := gemini.NewClient("fake-key-123")

	_, err := c.Simplify(context.Background(), "")
	if err == nil {
		t.Error("expected error for empty text, got nil")
	}
}

func TestSimplify_CallsAPI(t *testing.T) {
	c, _ := gemini.NewClient("fake-key-123")

	result, err := c.Simplify(context.Background(), "Art. 5° - todos são iguais perante a lei")
	if err != nil {
		t.Logf("expected error (API not implemented yet): %v", err)
	}
	_ = result
}
