package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/joho/godotenv"
	"github.com/Sofia-gith/LegislacaoFacil/lei-facil-backend/internal/gemini"
	"github.com/Sofia-gith/LegislacaoFacil/lei-facil-backend/internal/handler"
	"github.com/Sofia-gith/LegislacaoFacil/lei-facil-backend/internal/jobstore"
)

func main() {

	log.Println("[Main] Iniciando servidor LeiaFácil...")

	log.Printf("ANTES: %s", os.Getenv("GEMINI_API_KEY"))

	if err := godotenv.Load(); err != nil {
		log.Println("[Main] Aviso: arquivo .env não encontrado, usando variáveis de ambiente do sistema")
	}
	log.Printf("DEPOIS: %s", os.Getenv("GEMINI_API_KEY"))
	apiKey := os.Getenv("GEMINI_API_KEY")
	port := os.Getenv("PORT")
	allowedOrigin := os.Getenv("ALLOWED_ORIGIN")

	if apiKey == "" {
		log.Println("[Main] Aviso: GEMINI_API_KEY não configurada")
	} else {
		log.Println("[Main] GEMINI_API_KEY configurada")
	}
	wd, _ := os.Getwd()
	log.Printf("Diretório atual: %s", wd)

	err := godotenv.Load()
	log.Printf("godotenv.Load() = %v", err)

	log.Printf("ENV GEMINI_API_KEY: %.12s...", os.Getenv("GEMINI_API_KEY"))

	if port == "" {
		port = "8000"
		log.Println("[Main] PORT não configurada, usando default: 8000")
	} else {
		log.Printf("[Main] PORT configurada: %s\n", port)
	}

	if allowedOrigin != "" {
		log.Printf("[Main] ALLOWED_ORIGIN: %s\n", allowedOrigin)
	} else {
		log.Println("[Main] ALLOWED_ORIGIN vazia, permitindo requisições de qualquer origem")
	}

	geminiClient, err := gemini.NewClient(apiKey)
	if err != nil {
		log.Fatalf("[Main] Erro ao criar cliente Gemini: %v", err)
	}

	log.Println("[Main] Cliente Gemini criado com sucesso")

	// JobStore compartilhado entre /simplificar e /o-que-muda.
	// Limpeza a cada 10min remove jobs concluído/erro com mais de 30min —
	// tempo de sobra pro polling do frontend encontrar o resultado, sem
	// deixar o mapa crescer pra sempre.
	jobs := jobstore.NewInMemoryStore()
	stopCleanup := jobs.StartCleanup(10*time.Minute, 30*time.Minute)
	defer stopCleanup()

	mux := http.NewServeMux()

	simplificarHandler := handler.NewSimplificarHandler(geminiClient, jobs)
	mux.Handle("/simplificar", corsMiddleware(allowedOrigin, simplificarHandler))

	oQueMudaHandler := handler.NewOQueMudaHandler(geminiClient, jobs)
	mux.Handle("/o-que-muda", corsMiddleware(allowedOrigin, oQueMudaHandler))

	// Endpoint único de status — serve tanto /simplificar quanto /o-que-muda,
	// já que o Job guarda seu próprio Type. O client faz polling aqui.
	statusHandler := handler.NewStatusHandler(jobs)
	mux.Handle("/status/", corsMiddleware(allowedOrigin, statusHandler))

	log.Println("[Main] Rotas configuradas")

	addr := fmt.Sprintf(":%s", port)
	log.Printf("[Main] Servidor iniciado em http://localhost:%s", port)
	log.Fatal(http.ListenAndServe(addr, mux))
}

func corsMiddleware(allowedOrigin string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if allowedOrigin != "" {
			w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
		} else {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		}
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}