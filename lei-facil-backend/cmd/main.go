package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/Sofia-gith/LegislacaoFacil/lei-facil-backend/internal/gemini"
	"github.com/Sofia-gith/LegislacaoFacil/lei-facil-backend/internal/handler"
)

func main() {
	apiKey := os.Getenv("GEMINI_API_KEY")
	port := os.Getenv("PORT")
	allowedOrigin := os.Getenv("ALLOWED_ORIGIN")

	if port == "" {
		port = "8080"
	}

	geminiClient, err := gemini.NewClient(apiKey)
	if err != nil {
		log.Fatalf("failed to create gemini client: %v", err)
	}

	mux := http.NewServeMux()

	simplificarHandler := handler.NewSimplificarHandler(geminiClient)
	mux.Handle("/simplificar", corsMiddleware(allowedOrigin, simplificarHandler))

	addr := fmt.Sprintf(":%s", port)
	log.Printf("server listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}

func corsMiddleware(allowedOrigin string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if allowedOrigin != "" {
			w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
		}
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
