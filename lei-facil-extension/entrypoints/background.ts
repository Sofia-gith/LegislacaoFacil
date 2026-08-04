import { defineBackground } from 'wxt/utils/define-background';

// background.ts - Service worker for LeiaFácil extension (Manifest V3)

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
    console.error('[background] Erro ao gerar cacheId:', err);
    return 'default-' + Date.now().toString(36);
  }
}

interface SimplificacaoResult {
  resumo: string;
  corpo: string;
  pontos: string[];
}

interface OQueMudaResult {
  resumo: string;
  corpo: string;
  pontos: string[];
}

interface CacheEntry {
  linguagemSimples: SimplificacaoResult | null;
  oQueMudaPraMim: OQueMudaResult | null;
}

// Conjunto para rastrear jobs em andamento (evita duplicidade por cacheId + tipo)
const ongoingJobKeys = new Set<string>();

async function startJob(content: string, type: 'simplificar' | 'o-que-muda'): Promise<void> {
  const cacheId = criarCacheId(content);
  const jobKey = `${cacheId}:${type}`;

  // 1. Verifica cache existente
  const cachedData = await browser.storage.local.get(cacheId);
  const entry = cachedData[cacheId] as CacheEntry | undefined;

  if (entry) {
    if (type === 'simplificar' && entry.linguagemSimples !== null) {
      console.log(`[background] Já em cache: ${cacheId}`);
      browser.runtime.sendMessage({
        action: 'jobCompleted',
        cacheId,
        type,
        result: entry.linguagemSimples,
      });
      return;
    }
    if (type === 'o-que-muda' && entry.oQueMudaPraMim !== null) {
      console.log(`[background] Já em cache: ${cacheId}`);
      browser.runtime.sendMessage({
        action: 'jobCompleted',
        cacheId,
        type,
        result: entry.oQueMudaPraMim,
      });
      return;
    }
  }

  // 2. Trava de concorrência se o job já estiver rodando
  if (ongoingJobKeys.has(jobKey)) {
    console.log(`[background] Job já em andamento: ${jobKey}`);
    return;
  }

  ongoingJobKeys.add(jobKey);
  console.log(`[background] Iniciando job de ${type} para cacheId: ${cacheId}`);

  const endpoint =
    type === 'simplificar'
      ? 'http://localhost:8000/simplificar'
      : 'http://localhost:8000/o-que-muda';

  try {
    // 3. Criação do Job (202 Accepted)
    const createResponse = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: content }),
    });

    if (!createResponse.ok) {
      throw new Error(`Erro ao criar job backend: ${createResponse.status}`);
    }

    const jobData = await createResponse.json();
    if (!jobData.jobId) {
      throw new Error('Resposta do servidor inválida: jobId ausente');
    }

    // 4. Polling seguro usando loop assíncrono (em vez de setInterval)
    await pollJobStatusAsync(jobData.jobId, cacheId, type);
  } catch (err: any) {
    console.error(`[background] Falha no fluxo do job (${type}):`, err);
    browser.runtime.sendMessage({
      action: 'jobFailed',
      cacheId,
      type,
      error: err instanceof Error ? err.message : String(err),
    });
  } finally {
    ongoingJobKeys.delete(jobKey);
  }
}

// Função de polling assíncrono com retentativas para erros de rede pontuais
async function pollJobStatusAsync(
  jobId: string,
  cacheId: string,
  type: 'simplificar' | 'o-que-muda',
  intervalMs = 2000,
  maxAttempts = 90
): Promise<void> {
  let attempts = 0;
  let networkErrors = 0;

  while (attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    attempts++;

    try {
      const response = await fetch(`http://localhost:8000/status/${jobId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Erro ao consultar status: HTTP ${response.status}`);
      }

      const job = await response.json();
      console.log(`[background] Status do job ${jobId} (tentativa ${attempts}): ${job.status}`);

      if (job.status === 'concluido') {
        const result = job.resultado as SimplificacaoResult | OQueMudaResult;

        if (!result || !result.resumo || !result.corpo) {
          throw new Error('Resultado do job retornado em formato inválido');
        }

        // Salva no storage local
        const cachedData = await browser.storage.local.get(cacheId);
        let entry = (cachedData[cacheId] as CacheEntry | undefined) || {
          linguagemSimples: null,
          oQueMudaPraMim: null,
        };

        if (type === 'simplificar') {
          entry.linguagemSimples = result as SimplificacaoResult;
        } else {
          entry.oQueMudaPraMim = result as OQueMudaResult;
        }

        await browser.storage.local.set({ [cacheId]: entry });

        // Emite a mensagem de conclusão para o Popup
        browser.runtime.sendMessage({
          action: 'jobCompleted',
          cacheId,
          type,
          result,
        });
        return;
      }

      if (job.status === 'erro') {
        throw new Error(job.erro || 'O job falhou no servidor');
      }

      // Se ainda for 'pendente' ou 'processando', o loop continua normalmente...
    } catch (err: any) {
      // Se for um erro definitivo do backend (job.status === 'erro')
      if (err.message && err.message.includes('falhou no servidor')) {
        throw err;
      }

      // Tolera pequenas falhas de conexão de rede durante o polling
      networkErrors++;
      console.warn(`[background] Falha temporária no polling (${networkErrors}/5):`, err);
      if (networkErrors >= 5) {
        throw new Error(`Excesso de falhas de comunicação com o backend: ${err.message}`);
      }
    }
  }

  throw new Error('Tempo limite excedido aguardando o resultado do servidor.');
}

// Escuta de mensagens
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'abrirPopup') {
    browser.storage.local.set({ popupContent: message.conteudo });
    if (chrome.action?.openPopup) {
      chrome.action.openPopup();
    } else if (browser.action?.openPopup) {
      browser.action.openPopup();
    }
    sendResponse({ status: 'popup opened' });
    return true;
  }

  if (message.action === 'obterConteudo') {
    browser.storage.local.get(['popupContent']).then((result) => {
      sendResponse({ conteudo: result.popupContent || '' });
    });
    return true;
  }

  if (message.action === 'startSimplificarJob') {
    startJob(message.content, 'simplificar');
    sendResponse({ status: 'started' });
    return true;
  }

  if (message.action === 'startOQueMudaJob') {
    startJob(message.content, 'o-que-muda');
    sendResponse({ status: 'started' });
    return true;
  }

  return false;
});

export default defineBackground(() => {});