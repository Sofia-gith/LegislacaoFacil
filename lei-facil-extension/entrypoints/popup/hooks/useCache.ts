import { useState, useEffect } from 'react';
import type { RespostaStructurada } from '../types';

declare const chrome: any;

const CACHE_KEY = 'lei_facil_cache';
const MAX_CACHE_SIZE = 10;
const PROMPT_VERSION = 1;

interface CacheEntry {
  id: string;
  linguagemSimples: RespostaStructurada;
  oQueMudaPraMim: RespostaStructurada | null;
  versaoDoPrompt: number;
  timestamp: number;
}

interface CacheStorage {
  entries: CacheEntry[];
}

export function useCache() {
  const [cache, setCache] = useState<Map<string, CacheEntry>>(new Map());
  const [carregadoDoStorage, setCarregadoDoStorage] = useState(false);

  useEffect(() => {
    carregarCache();
  }, []);

  const carregarCache = async () => {
    try {
      const resultado = await chrome.storage.local.get(CACHE_KEY);
      const armazenado = resultado[CACHE_KEY] as CacheStorage | undefined;

      if (armazenado?.entries) {
        const mapa = new Map<string, CacheEntry>();
        for (const entry of armazenado.entries) {
          mapa.set(entry.id, entry);
        }
        setCache(mapa);
      }
      setCarregadoDoStorage(true);
    } catch (err) {
      console.error('Erro ao carregar cache:', err);
      setCarregadoDoStorage(true);
    }
  };

  const obterDoCache = (id: string): CacheEntry | null => {
    const entry = cache.get(id);
    if (entry && entry.versaoDoPrompt === PROMPT_VERSION) {
      return entry;
    }
    return null;
  };

  const salvarNoCache = async (
    id: string,
    linguagemSimples: RespostaStructurada,
    oQueMudaPraMim: RespostaStructurada | null = null
  ) => {
    try {
      const novaCache = new Map(cache);

      novaCache.set(id, {
        id,
        linguagemSimples,
        oQueMudaPraMim,
        versaoDoPrompt: PROMPT_VERSION,
        timestamp: Date.now(),
      });

      if (novaCache.size > MAX_CACHE_SIZE) {
        let atuaisEntries = Array.from(novaCache.values());
        atuaisEntries.sort((a, b) => a.timestamp - b.timestamp);
        const paraRemover = atuaisEntries[0].id;
        novaCache.delete(paraRemover);
      }

      setCache(novaCache);

      const storage: CacheStorage = {
        entries: Array.from(novaCache.values()),
      };

      await chrome.storage.local.set({ [CACHE_KEY]: storage });
    } catch (err) {
      console.error('Erro ao salvar cache:', err);
    }
  };

  const atualizarOQueMuda = async (id: string, oQueMudaPraMim: RespostaStructurada) => {
    try {
      const entry = cache.get(id);
      if (entry) {
        const novaEntry = { ...entry, oQueMudaPraMim, timestamp: Date.now() };
        const novaCache = new Map(cache);
        novaCache.set(id, novaEntry);
        setCache(novaCache);

        const storage: CacheStorage = {
          entries: Array.from(novaCache.values()),
        };

        await chrome.storage.local.set({ [CACHE_KEY]: storage });
      }
    } catch (err) {
      console.error('Erro ao atualizar cache:', err);
    }
  };

  return {
    cache,
    carregadoDoStorage,
    obterDoCache,
    salvarNoCache,
    atualizarOQueMuda,
  };
}
