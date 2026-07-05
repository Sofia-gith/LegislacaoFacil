import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCache } from '../useCache';
import type { RespostaStructurada } from '../../types';

const mockResposta: RespostaStructurada = {
  resumo: 'Resumo teste',
  corpo: 'Corpo da resposta',
  pontos: ['Ponto 1', 'Ponto 2'],
};

describe('useCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.chrome.storage.local.get as any).mockResolvedValue({});
    (global.chrome.storage.local.set as any).mockResolvedValue(undefined);
  });

  it('deve inicializar com cache vazio', async () => {
    const { result } = renderHook(() => useCache());

    expect(result.current.cache.size).toBe(0);
    expect(result.current.carregadoDoStorage).toBe(false);

    await waitFor(() => {
      expect(result.current.carregadoDoStorage).toBe(true);
    });
  });

  it('deve carregar cache do chrome storage ao montar', async () => {
    const mockEntry = {
      id: 'test-id',
      linguagemSimples: mockResposta,
      oQueMudaPraMim: null,
      versaoDoPrompt: 1,
      timestamp: Date.now(),
    };

    (global.chrome.storage.local.get as any).mockResolvedValue({
      lei_facil_cache: {
        entries: [mockEntry],
      },
    });

    const { result } = renderHook(() => useCache());

    await waitFor(() => {
      expect(result.current.cache.size).toBe(1);
    });

    expect(result.current.cache.get('test-id')).toEqual(mockEntry);
  });

  it('deve salvar item no cache', async () => {
    const { result } = renderHook(() => useCache());

    await act(async () => {
      await result.current.salvarNoCache('id-1', mockResposta);
    });

    expect(result.current.cache.get('id-1')).not.toBeNull();
    expect(global.chrome.storage.local.set).toHaveBeenCalled();
  });

  it('deve obter item do cache por ID', async () => {
    const { result } = renderHook(() => useCache());

    await act(async () => {
      await result.current.salvarNoCache('id-1', mockResposta);
    });

    const cached = result.current.obterDoCache('id-1');
    expect(cached).not.toBeNull();
    expect(cached?.linguagemSimples).toEqual(mockResposta);
  });

  it('deve retornar null para item com versão desatualizada', async () => {
    const { result } = renderHook(() => useCache());

    const mockEntry = {
      id: 'old-id',
      linguagemSimples: mockResposta,
      oQueMudaPraMim: null,
      versaoDoPrompt: 0,
      timestamp: Date.now(),
    };

    (global.chrome.storage.local.get as any).mockResolvedValue({
      lei_facil_cache: {
        entries: [mockEntry],
      },
    });

    const { result: result2 } = renderHook(() => useCache());

    await waitFor(() => {
      expect(result2.current.carregadoDoStorage).toBe(true);
    });

    const cached = result2.current.obterDoCache('old-id');
    expect(cached).toBeNull();
  });

  it('deve atualizar O que muda de um item existente', async () => {
    const { result } = renderHook(() => useCache());

    const novaResposta: RespostaStructurada = {
      resumo: 'O que muda',
      corpo: 'Impacto na vida',
      pontos: ['Afeta isto', 'Muda aquilo'],
    };

    await act(async () => {
      await result.current.salvarNoCache('id-1', mockResposta);
      await result.current.atualizarOQueMuda('id-1', novaResposta);
    });

    const updated = result.current.obterDoCache('id-1');
    expect(updated?.oQueMudaPraMim).toEqual(novaResposta);
  });

  it('deve retornar null ao obter item inexistente', () => {
    const { result } = renderHook(() => useCache());
    const cached = result.current.obterDoCache('id-inexistente');
    expect(cached).toBeNull();
  });

  it('deve lidar com erro ao carregar cache do storage', async () => {
    (global.chrome.storage.local.get as any).mockRejectedValue(
      new Error('Storage error')
    );

    const { result } = renderHook(() => useCache());

    await waitFor(() => {
      expect(result.current.carregadoDoStorage).toBe(true);
    });

    expect(result.current.cache.size).toBe(0);
  });
});
