import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSimplificar } from '../useSimplificar';
import type { RespostaAPI } from '../../types';

const mockResposta: RespostaAPI = {
  resumo: 'Resumo teste',
  corpo: 'Corpo da resposta',
  pontos: ['Ponto 1', 'Ponto 2'],
};

global.fetch = vi.fn();

describe('useSimplificar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.chrome.storage.local.get as any).mockResolvedValue({});
    (global.chrome.storage.local.set as any).mockResolvedValue(undefined);
    (global.fetch as any).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('deve inicializar com estado correto', () => {
    const { result } = renderHook(() => useSimplificar());

    expect(result.current.carregando).toBe(false);
    expect(result.current.resposta).toBeNull();
    expect(result.current.erro).toBe('');
  });

  it('deve retornar erro para conteúdo vazio', async () => {
    const { result } = renderHook(() => useSimplificar());

    await act(async () => {
      await result.current.simplificar('');
    });

    expect(result.current.erro).toBe('Nenhum conteúdo para simplificar');
    expect(result.current.resposta).toBeNull();
  });

  it('deve retornar erro para conteúdo com apenas espaços em branco', async () => {
    const { result } = renderHook(() => useSimplificar());

    await act(async () => {
      await result.current.simplificar('   \n\t  ');
    });

    expect(result.current.erro).toBe('Nenhum conteúdo para simplificar');
  });

  it('deve fazer requisição e retornar resposta válida', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      json: async () => mockResposta,
    });

    const { result } = renderHook(() => useSimplificar());

    await act(async () => {
      await result.current.simplificar('Conteúdo para simplificar');
    });

    expect(result.current.resposta).toEqual(mockResposta);
    expect(result.current.erro).toBe('');
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/simplificar',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('deve retornar erro para resposta HTTP com erro', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: new Map(),
    });

    const { result } = renderHook(() => useSimplificar());

    await act(async () => {
      await result.current.simplificar('Conteúdo');
    });

    expect(result.current.resposta).toBeNull();
    expect(result.current.erro).toContain('500');
  });

  it('deve limpar estado com função limpar', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      json: async () => mockResposta,
    });

    const { result } = renderHook(() => useSimplificar());

    await act(async () => {
      await result.current.simplificar('Conteúdo');
    });

    expect(result.current.resposta).not.toBeNull();

    act(() => {
      result.current.limpar();
    });

    expect(result.current.resposta).toBeNull();
    expect(result.current.erro).toBe('');
  });

  it('deve detectar resposta JSON inválida', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      json: async () => ({ resumo: 'Sem campos obrigatórios' }),
    });

    const { result } = renderHook(() => useSimplificar());

    await act(async () => {
      await result.current.simplificar('Conteúdo');
    });

    expect(result.current.erro).toContain('inválida');
  });

  it('deve lidar com erro de rede', async () => {
    (global.fetch as any).mockRejectedValue(
      new TypeError('Failed to fetch')
    );

    const { result } = renderHook(() => useSimplificar());

    await act(async () => {
      await result.current.simplificar('Conteúdo');
    });

    expect(result.current.resposta).toBeNull();
    expect(result.current.erro).toContain('Failed to fetch');
  });
});
