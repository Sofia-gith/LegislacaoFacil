import { useEffect, useState } from 'react';

declare const chrome: any;

/**
 * Busca o conteúdo já extraído da página (armazenado no background script)
 * assim que o popup é montado.
 */
export function useConteudoPagina() {
  const [conteudo, setConteudo] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    console.log('[useConteudoPagina] 📡 Solicitando conteúdo do background...');
    
    chrome.runtime.sendMessage({ action: 'obterConteudo' }, (response: any) => {
      console.log('[useConteudoPagina] Resposta do background recebida:', response);
      
      if (chrome.runtime.lastError) {
        const errorMsg = `Erro ao obter conteúdo: ${chrome.runtime.lastError.message}`;
        console.error('[useConteudoPagina] ❌', errorMsg);
        setErro(errorMsg);
        return;
      }

      if (response?.conteudo) {
        const conteudoRecebido = response.conteudo;
        console.log('[useConteudoPagina] ✅ Conteúdo recebido do background:', {
          tamanho: conteudoRecebido.length,
          vazio: !conteudoRecebido.trim(),
          primeiros100: conteudoRecebido.substring(0, 100)
        });
        setConteudo(conteudoRecebido);
      } else {
        const errorMsg = response?.error || 'Nenhum conteúdo extraído';
        console.error('[useConteudoPagina] ❌ Erro:', errorMsg, 'Response:', response);
        setErro(errorMsg);
      }
    });
  }, []);

  return { conteudo, erro };
}