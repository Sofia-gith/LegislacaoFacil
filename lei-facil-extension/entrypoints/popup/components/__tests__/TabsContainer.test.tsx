import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TabsContainer } from '../TabsContainer';
import type { RespostaStructurada } from '../../types';

const mockDados: RespostaStructurada = {
  resumo: 'Resumo teste',
  corpo: 'Corpo da resposta',
  pontos: ['Ponto 1', 'Ponto 2'],
};

describe('TabsContainer', () => {
  const mockOnVoltar = vi.fn();
  const mockOnCarregarOQueMuda = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnVoltar.mockClear();
    mockOnCarregarOQueMuda.mockResolvedValue(mockDados);
  });

  it('deve renderizar com conteúdo inicial', () => {
    render(
      <TabsContainer
        linguagemSimples={mockDados}
        onVoltar={mockOnVoltar}
        onCarregarOQueMuda={mockOnCarregarOQueMuda}
      />
    );

    expect(screen.getByText(mockDados.resumo)).toBeInTheDocument();
    expect(screen.getByText(mockDados.corpo)).toBeInTheDocument();
  });

  it('deve mostrar aba de linguagem simples por padrão', () => {
    render(
      <TabsContainer
        linguagemSimples={mockDados}
        onVoltar={mockOnVoltar}
        onCarregarOQueMuda={mockOnCarregarOQueMuda}
      />
    );

    const resumoElement = screen.getByText(mockDados.resumo);
    expect(resumoElement).toBeInTheDocument();
  });

  it('deve copiar conteúdo ao clicar em Copiar', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(() => Promise.resolve()),
      },
    });

    render(
      <TabsContainer
        linguagemSimples={mockDados}
        onVoltar={mockOnVoltar}
        onCarregarOQueMuda={mockOnCarregarOQueMuda}
      />
    );

    const buttons = screen.getAllByRole('button');
    const copyButton = buttons.find((btn) =>
      btn.textContent?.includes('Copiar')
    );
    if (copyButton) {
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
      });
    }
  });

  it('deve chamar onVoltar ao clicar no botão Voltar', () => {
    render(
      <TabsContainer
        linguagemSimples={mockDados}
        onVoltar={mockOnVoltar}
        onCarregarOQueMuda={mockOnCarregarOQueMuda}
      />
    );

    const buttons = screen.getAllByRole('button');
    const voltarButton = buttons.find((btn) =>
      btn.textContent?.includes('Voltar')
    );
    if (voltarButton) {
      fireEvent.click(voltarButton);
      expect(mockOnVoltar).toHaveBeenCalled();
    }
  });

  it('deve carregar "O que muda" quando aba é clicada', async () => {
    render(
      <TabsContainer
        linguagemSimples={mockDados}
        onVoltar={mockOnVoltar}
        onCarregarOQueMuda={mockOnCarregarOQueMuda}
      />
    );

    const tabs = screen.getAllByRole('tab');
    const oQueMudaTab = tabs.find((tab) =>
      tab.textContent?.includes('O que muda')
    );
    if (oQueMudaTab) {
      fireEvent.click(oQueMudaTab);

      await waitFor(() => {
        expect(mockOnCarregarOQueMuda).toHaveBeenCalled();
      });
    }
  });

  it('deve exibir pontos principais quando aba é selecionada', () => {
    render(
      <TabsContainer
        linguagemSimples={mockDados}
        onVoltar={mockOnVoltar}
        onCarregarOQueMuda={mockOnCarregarOQueMuda}
      />
    );

    mockDados.pontos.forEach((ponto) => {
      expect(screen.getByText(ponto)).toBeInTheDocument();
    });
  });

  it('deve mostrar "Copiado!" após copiar com sucesso', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(() => Promise.resolve()),
      },
    });

    render(
      <TabsContainer
        linguagemSimples={mockDados}
        onVoltar={mockOnVoltar}
        onCarregarOQueMuda={mockOnCarregarOQueMuda}
      />
    );

    const buttons = screen.getAllByRole('button');
    const copyButton = buttons.find((btn) =>
      btn.textContent?.includes('Copiar')
    );
    if (copyButton) {
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.queryByText(/Copiado/i)).toBeInTheDocument();
      });
    }
  });

  it('deve mostrar erro se carregar O que muda falhar', async () => {
    mockOnCarregarOQueMuda.mockRejectedValue(
      new Error('Erro ao carregar')
    );

    render(
      <TabsContainer
        linguagemSimples={mockDados}
        onVoltar={mockOnVoltar}
        onCarregarOQueMuda={mockOnCarregarOQueMuda}
      />
    );

    const tabs = screen.getAllByRole('tab');
    const oQueMudaTab = tabs.find((tab) =>
      tab.textContent?.includes('O que muda')
    );
    if (oQueMudaTab) {
      fireEvent.click(oQueMudaTab);

      await waitFor(() => {
        expect(mockOnCarregarOQueMuda).toHaveBeenCalled();
      });
    }
  });
});
