import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useConteudoPagina } from '../useConteudoPagina';

describe('useConteudoPagina', () => {
  let mockSendMessage: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSendMessage = vi.fn();
    (global.chrome.runtime as any) = {
      sendMessage: mockSendMessage,
      lastError: null,
    };
  });

  it('deve inicializar com valores padrão', () => {
    mockSendMessage.mockImplementation((_msg: any, callback: any) => {
      callback({});
    });

    const { result } = renderHook(() => useConteudoPagina());

    expect(typeof result.current.conteudo).toBe('string');
    expect(typeof result.current.erro).toBe('string');
  });

  it('deve retornar conteúdo do background script', async () => {
    const conteudoTeste = 'Lei Nº 1234 - Artigo 1º...';
    mockSendMessage.mockImplementation((_msg: any, callback: any) => {
      callback({ conteudo: conteudoTeste });
    });

    const { result } = renderHook(() => useConteudoPagina());

    await waitFor(() => {
      expect(result.current.conteudo).toBe(conteudoTeste);
    });

    expect(result.current.erro).toBe('');
  });

  it('deve enviar mensagem correta para o background', () => {
    mockSendMessage.mockImplementation((_msg: any, callback: any) => {
      callback({ conteudo: 'Test' });
    });

    renderHook(() => useConteudoPagina());

    expect(mockSendMessage).toHaveBeenCalledWith(
      { action: 'obterConteudo' },
      expect.any(Function)
    );
  });

  it('deve lidar com resposta vazia do background', async () => {
    mockSendMessage.mockImplementation((_msg: any, callback: any) => {
      callback({});
    });

    const { result } = renderHook(() => useConteudoPagina());

    await waitFor(() => {
      expect(result.current.erro).not.toBe('');
    });
  });

  it('deve usar erro customizado da resposta se existir', async () => {
    const erroCustomizado = 'Erro customizado do background';
    mockSendMessage.mockImplementation((_msg: any, callback: any) => {
      callback({ error: erroCustomizado });
    });

    const { result } = renderHook(() => useConteudoPagina());

    await waitFor(() => {
      expect(result.current.erro).toBe(erroCustomizado);
    });
  });

  it('deve lidar com erro do chrome.runtime', async () => {
    mockSendMessage.mockImplementation((_msg: any, callback: any) => {
      (global.chrome.runtime as any).lastError = {
        message: 'Não foi possível conectar',
      };
      callback({});
    });

    const { result } = renderHook(() => useConteudoPagina());

    await waitFor(() => {
      expect(result.current.erro).toContain('Não foi possível conectar');
    });
  });
});
