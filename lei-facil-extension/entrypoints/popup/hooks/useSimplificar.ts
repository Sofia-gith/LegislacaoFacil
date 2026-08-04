import { useState, useCallback } from 'react';
import type { RespostaAPI, RespostaStructurada } from '../types';
import { useCache } from './useCache';

const API_URL = 'http://localhost:8000/simplificar';
const API_URL_O_QUE_MUDA = 'http://localhost:8000/o-que-muda';

function criarCacheId(conteudo: string): string {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(conteudo);
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash) + data[i];
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36).substring(0, 16);
  } catch (err) {
    console.error('[useSimplificar] Erro ao gerar cacheId:', err);
    return 'default-' + Date.now().toString(36);
  }
}

async function aguardarConclusao(jobId: string): Promise<RespostaStructurada> {
  while (true) {
    const res = await fetch(`http://localhost:8000/status/${jobId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`Erro ao buscar status: ${res.status}`);
    }

    const job = await res.json();
    console.log('[useSimplificar] Status do job:', job.status);

    if (job.status === 'concluido') {
      // The result is stored in job.resultado
      if (job.resultado && typeof job.resultado === 'object') {
        const resultado = job.resultado as RespostaStructurada;
        if (resultado.resumo && resultado.corpo && Array.isArray(resultado.pontos)) {
          return resultado;
        }
      }
      throw new Error('Resultado do job está em formato inválido');
    }

    if (job.status === 'erro') {
      throw new Error(job.erro || 'Erro desconhecido durante o processamento');
    }

    // Ainda processando, aguardar um pouco antes de tentar novamente
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

export function useSimplificar(conteudoId?: string) {
  const [carregando, setCarregando] = useState(false);
  const [resposta, setResposta] = useState<RespostaStructurada | null>(null);
  const [erro, setErro] = useState('');
  const { obterDoCache, salvarNoCache, atualizarOQueMuda } = useCache();

  const simplificar = useCallback(
    async (conteudo: string, id?: string) => {
      const conteudoTrimmed = conteudo.trim();
      
      if (!conteudoTrimmed) {
        console.error('[useSimplificar] Conteúdo vazio ou inválido:', {
          tamanhoOriginal: conteudo.length,
          tamanhoAposTrim: conteudoTrimmed.length,
          conteudo: conteudo.substring(0, 100)
        });
        setErro('Nenhum conteúdo para simplificar');
        return;
      }

      const cacheId = id || conteudoId || criarCacheId(conteudoTrimmed);

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
        console.log('[useSimplificar] Dados que serão enviados:', {
          textLength: conteudoTrimmed.length,
          textPreview: conteudoTrimmed.substring(0, 100)
        });

        // Step 1: Create job
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: conteudoTrimmed }),
        });

        console.log('[useSimplificar] Resposta de criação de job recebida - Status:', res.status);

        if (!res.ok) {
          throw new Error(`Erro ${res.status}: ${res.statusText}`);
        }

        const jobData = await res.json();
        console.log('[useSimplificar] Job criado:', jobData);

        if (!jobData.jobId) {
          throw new Error('Resposta do servidor inválida: jobId não encontrado');
        }

        // Step 2: Poll for completion
        const resultado = await aguardarConclusao(jobData.jobId);
        console.log('[useSimplificar] Resultado obtido:', resultado);

        setResposta(resultado);
        await salvarNoCache(cacheId, resultado);
       } catch (err) {
         console.error('[useSimplificar] Erro:', {
           erro: err instanceof Error ? err.message : String(err),
           stack: err instanceof Error ? err.stack : undefined,
           tipo: err instanceof TypeError ? 'TypeError (possível CORS ou rede)' : 'Outro erro'
         });
         setErro(err instanceof Error ? err.message : String(err));
       } finally {
         setCarregando(false);
       }
    },
    [obterDoCache, salvarNoCache, conteudoId]
  );

  const carregarOQueMuda = useCallback(
    async (conteudo: string, id?: string): Promise<RespostaStructurada | null> => {
      const conteudoTrimmed = conteudo.trim();
      const cacheId = id || conteudoId || criarCacheId(conteudoTrimmed);

      const doCache = obterDoCache(cacheId);
      if (doCache?.oQueMudaPraMim) {
        console.log('[useSimplificar] Usando O que muda do cache');
        return doCache.oQueMudaPraMim;
      }

      try {
        console.log('[useSimplificar] Enviando requisição para', API_URL_O_QUE_MUDA);
        console.log('[useSimplificar] Dados que serão enviados:', {
          textLength: conteudoTrimmed.length,
          textPreview: conteudoTrimmed.substring(0, 100)
        });

        // Step 1: Create job
        const res = await fetch(API_URL_O_QUE_MUDA, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: conteudoTrimmed }),
        });

        console.log('[useSimplificar] Resposta de criação de job recebida - Status:', res.status);

        if (!res.ok) {
          throw new Error(`Erro ${res.status}: ${res.statusText}`);
        }

        const jobData = await res.json();
        console.log('[useSimplificar] Job criado:', jobData);

        if (!jobData.jobId) {
          throw new Error('Resposta do servidor inválida: jobId não encontrado');
        }

        // Step 2: Poll for completion
        const resultado = await aguardarConclusao(jobData.jobId);
        console.log('[useSimplificar] Resultado O que muda obtido:', resultado);

        await atualizarOQueMuda(cacheId, resultado);
        return resultado;
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