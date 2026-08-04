package jobstore_test

import (
	"testing"
	"time"

	"github.com/Sofia-gith/LegislacaoFacil/lei-facil-backend/internal/jobstore"
)

func TestCreate(t *testing.T) {
	s := jobstore.NewInMemoryStore()

	job, err := s.Create(jobstore.TypeSimplificar)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if job.ID == "" {
		t.Error("expected non-empty job ID")
	}
	if job.Status != jobstore.StatusPendente {
		t.Errorf("expected status pendente, got %s", job.Status)
	}
	if job.Type != jobstore.TypeSimplificar {
		t.Errorf("expected type simplificar, got %s", job.Type)
	}
}

func TestGet_NotFound(t *testing.T) {
	s := jobstore.NewInMemoryStore()

	_, err := s.Get("id-inexistente")
	if err != jobstore.ErrJobNotFound {
		t.Errorf("expected ErrJobNotFound, got %v", err)
	}
}

func TestGet_ExistingJob_IsAvailableImmediatelyAfterCreate(t *testing.T) {
	// Garante que não existe uma janela onde o jobID já foi devolvido
	// ao cliente mas o Get ainda não encontra o job.
	s := jobstore.NewInMemoryStore()

	job, _ := s.Create(jobstore.TypeOQueMuda)

	got, err := s.Get(job.ID)
	if err != nil {
		t.Fatalf("expected job to be immediately gettable, got error: %v", err)
	}
	if got.ID != job.ID {
		t.Errorf("expected ID %s, got %s", job.ID, got.ID)
	}
}

func TestSetProcessing(t *testing.T) {
	s := jobstore.NewInMemoryStore()
	job, _ := s.Create(jobstore.TypeSimplificar)

	if err := s.SetProcessing(job.ID); err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	got, _ := s.Get(job.ID)
	if got.Status != jobstore.StatusProcessando {
		t.Errorf("expected status processando, got %s", got.Status)
	}
}

func TestSetCompleted(t *testing.T) {
	s := jobstore.NewInMemoryStore()
	job, _ := s.Create(jobstore.TypeSimplificar)

	result := map[string]string{"resumo": "teste"}
	if err := s.SetCompleted(job.ID, result); err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	got, _ := s.Get(job.ID)
	if got.Status != jobstore.StatusConcluido {
		t.Errorf("expected status concluido, got %s", got.Status)
	}
	if got.Result == nil {
		t.Error("expected result to be set")
	}
}

func TestSetError(t *testing.T) {
	s := jobstore.NewInMemoryStore()
	job, _ := s.Create(jobstore.TypeSimplificar)

	if err := s.SetError(job.ID, "algo deu errado"); err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	got, _ := s.Get(job.ID)
	if got.Status != jobstore.StatusErro {
		t.Errorf("expected status erro, got %s", got.Status)
	}
	if got.Error != "algo deu errado" {
		t.Errorf("expected error message, got %q", got.Error)
	}
}

func TestUpdate_NotFound(t *testing.T) {
	s := jobstore.NewInMemoryStore()

	if err := s.SetProcessing("id-inexistente"); err != jobstore.ErrJobNotFound {
		t.Errorf("expected ErrJobNotFound, got %v", err)
	}
}

func TestGet_ReturnsCopyNotSharedPointer(t *testing.T) {
	// Mutar o job devolvido pelo Get não pode afetar o estado interno do store.
	s := jobstore.NewInMemoryStore()
	job, _ := s.Create(jobstore.TypeSimplificar)

	got, _ := s.Get(job.ID)
	got.Status = jobstore.StatusErro

	fresh, _ := s.Get(job.ID)
	if fresh.Status != jobstore.StatusPendente {
		t.Errorf("mutating the returned copy affected internal state: got status %s", fresh.Status)
	}
}

func TestCleanup_RemovesOldFinishedJobs(t *testing.T) {
	s := jobstore.NewInMemoryStore()

	finished, _ := s.Create(jobstore.TypeSimplificar)
	_ = s.SetCompleted(finished.ID, "resultado")

	pending, _ := s.Create(jobstore.TypeSimplificar)

	stop := s.StartCleanup(20*time.Millisecond, 10*time.Millisecond)
	defer stop()

	time.Sleep(80 * time.Millisecond)

	if _, err := s.Get(finished.ID); err != jobstore.ErrJobNotFound {
		t.Errorf("expected finished job to be cleaned up, got err=%v", err)
	}
	if _, err := s.Get(pending.ID); err != nil {
		t.Errorf("expected pending job to survive cleanup, got err=%v", err)
	}
}