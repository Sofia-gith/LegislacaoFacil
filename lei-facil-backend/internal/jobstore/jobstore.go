package jobstore

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"log"
	"sync"
	"time"
)

// JobType identifica qual fluxo gerou o job — permite um único store
// compartilhado entre /simplificar e /o-que-muda sem duplicar lógica.
type JobType string

const (
	TypeSimplificar JobType = "simplificar"
	TypeOQueMuda    JobType = "o-que-muda"
)

// Status representa o ciclo de vida do job: pendente -> processando -> concluido | erro.
type Status string

const (
	StatusPendente    Status = "pendente"
	StatusProcessando Status = "processando"
	StatusConcluido   Status = "concluido"
	StatusErro        Status = "erro"
)

var ErrJobNotFound = errors.New("jobstore: job não encontrado")

// Job guarda o estado de uma requisição de simplificação processada em background.
type Job struct {
	ID        string      `json:"id"`
	Type      JobType     `json:"tipo"`
	Status    Status      `json:"status"`
	Result    interface{} `json:"resultado,omitempty"`
	Error     string      `json:"erro,omitempty"`
	CreatedAt time.Time   `json:"criadoEm"`
	UpdatedAt time.Time   `json:"atualizadoEm"`
}

// Store é a abstração do armazenamento de jobs — mockável nos testes,
// no mesmo espírito do Simplifier em internal/handler.
type Store interface {
	Create(jobType JobType) (*Job, error)
	Get(id string) (*Job, error)
	SetProcessing(id string) error
	SetCompleted(id string, result interface{}) error
	SetError(id string, errMsg string) error
}

// InMemoryStore é um Store guardado em mapa, protegido por RWMutex.
// Trade-off consciente: se o processo reiniciar, jobs em andamento se perdem.
// Para o volume do LeiaFácil isso é aceitável; o pior caso é o usuário reenviar o texto.
type InMemoryStore struct {
	mu   sync.RWMutex
	jobs map[string]*Job

	stopCleanup chan struct{}
}

func NewInMemoryStore() *InMemoryStore {
	return &InMemoryStore{
		jobs: make(map[string]*Job),
	}
}

func (s *InMemoryStore) Create(jobType JobType) (*Job, error) {
	id, err := generateID()
	if err != nil {
		return nil, err
	}

	now := time.Now()
	job := &Job{
		ID:        id,
		Type:      jobType,
		Status:    StatusPendente,
		CreatedAt: now,
		UpdatedAt: now,
	}

	s.mu.Lock()
	s.jobs[id] = job
	s.mu.Unlock()

	log.Printf("[JobStore] Job criado - ID: %s, Tipo: %s", id, jobType)

	// Devolve uma cópia para que o chamador nunca segure um ponteiro
	// para o mesmo objeto que o store está mutando internamente.
	copy := *job
	return &copy, nil
}

func (s *InMemoryStore) Get(id string) (*Job, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	job, ok := s.jobs[id]
	if !ok {
		return nil, ErrJobNotFound
	}

	copy := *job
	return &copy, nil
}

func (s *InMemoryStore) SetProcessing(id string) error {
	return s.update(id, func(j *Job) {
		j.Status = StatusProcessando
	})
}

func (s *InMemoryStore) SetCompleted(id string, result interface{}) error {
	return s.update(id, func(j *Job) {
		j.Status = StatusConcluido
		j.Result = result
	})
}

func (s *InMemoryStore) SetError(id string, errMsg string) error {
	return s.update(id, func(j *Job) {
		j.Status = StatusErro
		j.Error = errMsg
	})
}

func (s *InMemoryStore) update(id string, mutate func(*Job)) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	job, ok := s.jobs[id]
	if !ok {
		return ErrJobNotFound
	}

	mutate(job)
	job.UpdatedAt = time.Now()

	log.Printf("[JobStore] Job atualizado - ID: %s, Status: %s", id, job.Status)
	return nil
}

// StartCleanup roda em background e remove jobs concluídos/com erro mais
// antigos que maxAge, a cada interval. Evita que o mapa cresça pra sempre.
// Chamar uma única vez; retorna uma função para encerrar a goroutine.
func (s *InMemoryStore) StartCleanup(interval, maxAge time.Duration) (stop func()) {
	s.stopCleanup = make(chan struct{})
	ticker := time.NewTicker(interval)

	go func() {
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				s.cleanup(maxAge)
			case <-s.stopCleanup:
				return
			}
		}
	}()

	return func() { close(s.stopCleanup) }
}

func (s *InMemoryStore) cleanup(maxAge time.Duration) {
	cutoff := time.Now().Add(-maxAge)

	s.mu.Lock()
	defer s.mu.Unlock()

	removed := 0
	for id, job := range s.jobs {
		finished := job.Status == StatusConcluido || job.Status == StatusErro
		if finished && job.UpdatedAt.Before(cutoff) {
			delete(s.jobs, id)
			removed++
		}
	}
	if removed > 0 {
		log.Printf("[JobStore] Limpeza: %d job(s) removido(s)", removed)
	}
}

func generateID() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}