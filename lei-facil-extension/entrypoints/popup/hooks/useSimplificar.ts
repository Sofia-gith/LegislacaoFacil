import { useState, useCallback } from 'react';
import type { RespostaAPI, RespostaStructurada } from '../types';
import { useCache } from './useCache';

const API_URL = 'http://localhost:8000/simplificar';
const API_URL_O_QUE_MUDA = 'http://localhost:8000/o-que-muda';

export function useSimplificar(conteudoId?: string) {
  const [carregando, setCarregando] = useState(false);
  const [resposta, setResposta] = useState<RespostaStructurada | null>(null);
  const [erro, setErro] = useState('');
  const { obterDoCache, salvarNoCache, atualizarOQueMuda } = useCache();

  const simplificar = useCallback(
    async (conteudo: string, id?: string) => {
      if (!conteudo.trim()) {
        setErro('Nenhum conteúdo para simplificar');
        return;
      }

      const cacheId = id || conteudoId || btoa(conteudo).slice(0, 16);

      const doCache = obterDoCache(cacheId);
      if (doCache) {
        console.log('[useSimplificar] Usando resultado do cache');
        setResposta(doCache.linguagemSimples);
        setErro('');
        return;
      }

      setCarregando(true);
      setErro('');
      setResposta(null);

      try {
        console.log('[useSimplificar] Enviando requisição para', API_URL);
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: conteudo }),
        });

        console.log('[useSimplificar] Status da resposta:', res.status);

        if (!res.ok) {
          throw new Error(`Erro ${res.status}: ${res.statusText}`);
        }

        const dados: RespostaAPI = await res.json();
        console.log('[useSimplificar] Dados recebidos:', dados);

        if (!dados.resumo || !dados.corpo || !dados.pontos) {
          throw new Error('Resposta do servidor inválida');
        }

        setResposta(dados);
        await salvarNoCache(cacheId, dados);
      } catch (err) {
        console.error('[useSimplificar] Erro:', err);
        setErro(err instanceof Error ? err.message : String(err));
      } finally {
        setCarregando(false);
      }
    },
    [obterDoCache, salvarNoCache, conteudoId]
  );

  const carregarOQueMuda = useCallback(
    async (conteudo: string, id?: string): Promise<RespostaStructurada | null> => {
      const cacheId = id || conteudoId || btoa(conteudo).slice(0, 16);

      const doCache = obterDoCache(cacheId);
      if (doCache?.oQueMudaPraMim) {
        console.log('[useSimplificar] Usando O que muda do cache');
        return doCache.oQueMudaPraMim;
      }

      try {
        console.log('[useSimplificar] Enviando requisição para', API_URL_O_QUE_MUDA);
        const res = await fetch(API_URL_O_QUE_MUDA, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: conteudo }),
        });

        console.log('[useSimplificar] Status da resposta O que muda:', res.status);

        if (!res.ok) {
          throw new Error(`Erro ${res.status}: ${res.statusText}`);
        }

        const dados: RespostaAPI = await res.json();
        console.log('[useSimplificar] Dados O que muda recebidos:', dados);

        if (!dados.resumo || !dados.corpo) {
          throw new Error('Resposta inválida do servidor');
        }

        await atualizarOQueMuda(cacheId, dados);
        return dados;
      } catch (err) {
        console.error('[useSimplificar] Erro ao carregar O que muda:', err);
        throw new Error(err instanceof Error ? err.message : 'Erro ao carregar dados');
      }
    },
    [obterDoCache, atualizarOQueMuda, conteudoId]
  );

  const limpar = () => {
    setResposta(null);
    setErro('');
  };

  return { carregando, resposta, erro, simplificar, carregarOQueMuda, limpar };
}