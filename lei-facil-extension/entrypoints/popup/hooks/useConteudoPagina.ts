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
    chrome.runtime.sendMessage({ action: 'obterConteudo' }, (response: any) => {
      if (chrome.runtime.lastError) {
        console.error('[Popup] Erro ao obter conteúdo:', chrome.runtime.lastError.message);
        setErro('Erro ao comunicar com extensão');
        return;
      }

      if (response?.conteudo) {
        setConteudo(response.conteudo);
      } else {
        setErro('Nenhum conteúdo extraído');
      }
    });
  }, []);

  return { conteudo, erro };
}