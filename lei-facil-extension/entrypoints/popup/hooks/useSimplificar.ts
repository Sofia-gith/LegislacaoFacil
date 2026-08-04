import { useState, useCallback, useRef, useEffect } from "react";
import type { RespostaAPI, RespostaStructurada } from "../types";
import { useCache } from "./useCache";

declare const chrome: any;

const API_URL = "http://localhost:8000/simplificar";
const API_URL_O_QUE_MUDA = "http://localhost:8000/o-que-muda";

function criarCacheId(conteudo: string): string {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(conteudo);
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = (hash << 5) - hash + data[i];
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36).substring(0, 16);
  } catch (err) {
    console.error("[useSimplificar] Erro ao gerar cacheId:", err);
    return "default-" + Date.now().toString(36);
  }
}

export function useSimplificar(conteudoId?: string) {
  const [carregando, setCarregando] = useState(false);
  const [resposta, setResposta] = useState<RespostaStructurada | null>(null);
  const [erro, setErro] = useState("");
  const { obterDoCache, salvarNoCache, atualizarOQueMuda } = useCache();

  // Ref to track the current simplificação cacheId we are waiting for (to update estado)
  const currentSimplificarCacheIdRef = useRef<string | null>(null);
  // Ref to map of pending promises for o-que-muda jobs (cacheId -> promise)
  const pendingOQueMudaPromisesRef = useRef<
    Map<
      string,
      {
        resolve: (value: RespostaStructurada) => void;
        reject: (reason?: any) => void;
      }
    >
  >(new Map());

  // Listener for messages from background
  useEffect(() => {
    // Function to restore the current cacheId from storage on mount
    const restoreCurrentCacheId = async () => {
      try {
        const result = await chrome.storage.local.get(
          "currentSimplificarCacheId",
        );
        if (result.currentSimplificarCacheId) {
          currentSimplificarCacheIdRef.current =
            result.currentSimplificarCacheId;
          console.log(
            "[useSimplificar] Restored current cacheId from storage:",
            result.currentSimplificarCacheId,
          );
        }
      } catch (err) {
        console.error(
          "[useSimplificar] Failed to restore cacheId from storage:",
          err,
        );
      }
    };

    // Restore cacheId on mount
    restoreCurrentCacheId();

    const listener = (message: any) => {
      console.log("[useSimplificar] Mensagem recebida do background:", message);

      // Handle jobCompleted and jobFailed for simplificação (to update hook estado)
      if (message.action === "jobCompleted" || message.action === "jobFailed") {
        if (
          message.type === "simplificar" &&
          message.cacheId === currentSimplificarCacheIdRef.current
        ) {
          if (message.action === "jobCompleted") {
            setResposta(message.result);
            setErro("");
          } else if (message.action === "jobFailed") {
            setErro(message.error || "Erro desconhecido");
          }
          setCarregando(false);
          // Clear the current cacheId since we've handled the job
          currentSimplificarCacheIdRef.current = null;
          // Clear stored cacheId
          chrome.storage.local.remove("currentSimplificarCacheId");
        }
      }

      // Handle jobCompleted and jobFailed for o-que-muda (to resolve/reject promises)
      if (message.action === "jobCompleted" || message.action === "jobFailed") {
        if (message.type === "o-que-muda") {
          const cacheId = message.cacheId;
          const pending = pendingOQueMudaPromisesRef.current.get(cacheId);
          if (pending) {
            if (message.action === "jobCompleted") {
              pending.resolve(message.result);
            } else if (message.action === "jobFailed") {
              pending.reject(message.error || "Erro desconhecido");
            }
            // Remove the promise from the map
            pendingOQueMudaPromisesRef.current.delete(cacheId);
          }
        }
      }
    };

    browser.runtime.onMessage.addListener(listener);
    return () => {
      browser.runtime.onMessage.removeListener(listener);
    };
  }, []);

  const simplificar = useCallback(
    async (conteudo: string, id?: string) => {
      const conteudoTrimmed = conteudo.trim();

      if (!conteudoTrimmed) {
        console.error("[useSimplificar] Conteúdo vazio ou inválido:", {
          tamanhoOriginal: conteudo.length,
          tamanhoAposTrim: conteudoTrimmed.length,
          conteudo: conteudo.substring(0, 100),
        });
        setErro("Nenhum conteúdo para simplificar");
        setCarregando(false);
        return;
      }

      const cacheId = id || conteudoId || criarCacheId(conteudoTrimmed);

      // Check cache first
      const doCache = obterDoCache(cacheId);
      if (doCache && doCache.linguagemSimples !== null) {
        console.log("[useSimplificar] Usando resultado do cache");
        setResposta(doCache.linguagemSimples);
        setErro("");
        setCarregando(false);
        return;
      }

      // Set loading state
      setCarregando(true);
      setErro("");
      setResposta(null);

      // Track that we are waiting for this cacheId for simplificação
      currentSimplificarCacheIdRef.current = cacheId;

      // Store current cacheId in storage so it survives unmounts/mounts
      chrome.storage.local.set({ currentSimplificarCacheId: cacheId });

      // Send message to background to start the job
      try {
        const response = await browser.runtime.sendMessage({
          action: "startSimplificarJob",
          content: conteudoTrimmed,
        });
        console.log(
          "[useSimplificar] Mensagem enviada para background:",
          response,
        );
      } catch (err) {
        console.error(
          "[useSimplificar] Falha ao enviar mensagem para background:",
          err,
        );
        setErro("Falha ao enviar mensagem para background");
        setErro("Falha ao iniciar processo de simplificação");
        setCarregando(false);
        currentSimplificarCacheIdRef.current = null;
        // Clear stored cacheId on error
        chrome.storage.local.remove("currentSimplificarCacheId");
      }
    },
    [obterDoCache, salvarNoCache, conteudoId],
  );

  const carregarOQueMuda = useCallback(
    async (conteudo: string, id?: string): Promise<RespostaStructurada> => {
      const conteudoTrimmed = conteudo.trim();

      if (!conteudoTrimmed) {
        return Promise.reject("Nenhum conteúdo para processar");
      }

      const cacheId = id || conteudoId || criarCacheId(conteudoTrimmed);

      // Check cache first
      const doCache = obterDoCache(cacheId);
      if (doCache && doCache.oQueMudaPraMim !== null) {
        console.log("[useSimplificar] Usando O que muda do cache");
        return Promise.resolve(doCache.oQueMudaPraMim);
      }

      // Check if we already have a promise pending for this cacheId
      const existingPromise = pendingOQueMudaPromisesRef.current.get(cacheId);
      if (existingPromise) {
        return new Promise((resolve, reject) => {
          pendingOQueMudaPromisesRef.current.set(cacheId, { resolve, reject });
        });
      }

      // Create a new promise
      return new Promise((resolve, reject) => {
        // Store the resolve/reject functions
        pendingOQueMudaPromisesRef.current.set(cacheId, { resolve, reject });

        // Send message to background to start the job
        browser.runtime
          .sendMessage({
            action: "startOQueMudaJob",
            content: conteudoTrimmed,
          })
          .catch((err: unknown) => {
            console.error(
              "[useSimplificar] Falha ao enviar mensagem para background (O que muda):",
              err,
            );

            pendingOQueMudaPromisesRef.current.delete(cacheId);

            if (err instanceof Error) {
              reject(err.message);
            } else {
              reject("Falha ao iniciar processo de O que muda");
            }
          });
      });
    },
    [obterDoCache, atualizarOQueMuda, conteudoId],
  );

  // Exemplo de implementação no useSimplificar.ts / api service

async function solicitarSimplificacao(texto: string) {
  // 1. Envia a requisição inicial para iniciar o Job
  const res = await fetch('http://localhost:8000/simplificar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: texto }),
  });

  if (!res.ok) {
    throw new Error('Falha ao solicitar simplificação');
  }

  const initialData = await res.json();
  const { jobId } = initialData;

  // 2. Faz Polling no endpoint /status/{jobId} até ser concluído ou dar erro
  return await pollJobStatus(jobId);
}

async function pollJobStatus(jobId: string, intervalMs = 2000, maxAttempts = 60) {
  let attempts = 0;

  while (attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    attempts++;

    const res = await fetch(`http://localhost:8000/status/${jobId}`);
    if (!res.ok) {
      throw new Error('Erro ao consultar status do job');
    }

    const job = await res.json();

    if (job.status === 'concluido') {
      return job.resultado; // Retorna os dados que o frontend precisa
    }

    if (job.status === 'erro') {
      throw new Error(job.erro || 'Ocorreu um erro no processamento do job');
    }

    // Se o status for 'pendente' ou 'processando', o loop continua
  }

  throw new Error('Tempo limite excedido aguardando resposta');
}

  const limpar = () => {
    setResposta(null);
    setErro("");
    setCarregando(false);
    // Clear any pending state
    currentSimplificarCacheIdRef.current = null;
    // Clear stored cacheId
    chrome.storage.local.remove("currentSimplificarCacheId");
  };

  return { carregando, resposta, erro, simplificar, carregarOQueMuda, limpar };
}
