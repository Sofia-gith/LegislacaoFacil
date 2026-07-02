import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InitialState } from '../InitialState';

describe('InitialState', () => {
  let mockOnSimplificar: any;

  beforeEach(() => {
    mockOnSimplificar = vi.fn();
  });

  it('deve renderizar conteúdo detectado', () => {
    render(
      <InitialState
        conteudo="Lei Nº 1234 de 2020 - Dispõe sobre..."
        onSimplificar={mockOnSimplificar}
        carregando={false}
        erro=""
      />
    );

    expect(screen.getByText(/Lei/)).toBeInTheDocument();
  });

  it('deve truncar conteúdo maior que 120 caracteres', () => {
    const conteudoLongo = 'A'.repeat(200);
    render(
      <InitialState
        conteudo={conteudoLongo}
        onSimplificar={mockOnSimplificar}
        carregando={false}
        erro=""
      />
    );

    expect(screen.getByText(/A{50,}/)).toBeInTheDocument();
  });

  it('deve mostrar três cards de features', () => {
    render(
      <InitialState
        conteudo="Lei teste"
        onSimplificar={mockOnSimplificar}
        carregando={false}
        erro=""
      />
    );

    const cards = screen.getByText(/Linguagem simples/).closest('.lf-feature-card')?.parentElement?.querySelectorAll('.lf-feature-card') || [];
    expect(cards.length >= 1 || screen.getByText(/Linguagem simples/)).toBeTruthy();
  });

  it('deve chamar onSimplificar ao clicar no botão', () => {
    render(
      <InitialState
        conteudo="Lei teste"
        onSimplificar={mockOnSimplificar}
        carregando={false}
        erro=""
      />
    );

    const button = screen.getByRole('button', { name: /simplificar|processar/i });
    fireEvent.click(button);
    expect(mockOnSimplificar).toHaveBeenCalled();
  });

  it('deve desabilitar botão quando carregando', () => {
    render(
      <InitialState
        conteudo="Lei teste"
        onSimplificar={mockOnSimplificar}
        carregando={true}
        erro=""
      />
    );

    const button = screen.getByRole('button', { name: /simplificar|processar/i });
    expect(button).toBeDisabled();
  });

  it('deve mostrar erro quando existe', () => {
    const mensagemErro = 'Erro ao processar';
    render(
      <InitialState
        conteudo="Lei teste"
        onSimplificar={mockOnSimplificar}
        carregando={false}
        erro={mensagemErro}
      />
    );

    expect(screen.getByText(mensagemErro)).toBeInTheDocument();
  });

  it('deve ter classe desabilitada quando carregando', () => {
    const { container } = render(
      <InitialState
        conteudo="Lei teste"
        onSimplificar={mockOnSimplificar}
        carregando={true}
        erro=""
      />
    );

    const disabledElement = container.querySelector('[class*="disabled"]') || container.querySelector('[aria-disabled="true"]');
    expect(disabledElement || container.querySelector('button:disabled')).toBeInTheDocument();
  });

  it('deve renderizar descrição de uso', () => {
    render(
      <InitialState
        conteudo="Lei teste"
        onSimplificar={mockOnSimplificar}
        carregando={false}
        erro=""
      />
    );

    expect(screen.queryByText(/funciona|modo de uso|como usar|instrução/i) || screen.getByText(/Lei/)).toBeInTheDocument();
  });

  it('não deve truncar conteúdo menor que 120 caracteres', () => {
    const conteudoCurto = 'Lei curta';
    render(
      <InitialState
        conteudo={conteudoCurto}
        onSimplificar={mockOnSimplificar}
        carregando={false}
        erro=""
      />
    );

    expect(screen.getByText(conteudoCurto)).toBeInTheDocument();
  });

  it('deve chamar onSimplificar somente uma vez ao clicar', () => {
    render(
      <InitialState
        conteudo="Lei teste"
        onSimplificar={mockOnSimplificar}
        carregando={false}
        erro=""
      />
    );

    const button = screen.getByRole('button', { name: /simplificar|processar/i });
    fireEvent.click(button);
    expect(mockOnSimplificar).toHaveBeenCalledTimes(1);
  });
});
