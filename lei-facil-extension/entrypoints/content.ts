declare const chrome: any;

function extrairTextoCompleto(elemento: Element): string {
  const html = elemento.innerHTML;
  console.log('[Content] HTML da div:', html.length, 'caracteres');
  
  let texto = '';
  
  function percorrer(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const conteudo = node.textContent || '';
      texto += conteudo;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      
      for (let i = 0; i < node.childNodes.length; i++) {
        percorrer(node.childNodes[i]);
      }
      
      if (['BR', 'P', 'DIV', 'SECTION', 'ARTICLE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(el.tagName)) {
        texto += '\n';
      }
    }
  }
  
  percorrer(elemento);
  console.log('[Content] Texto extraído recursivo:', texto.length, 'caracteres');
  
  const innerTextResult = (elemento as HTMLElement).innerText || '';
  console.log('[Content] Texto com innerText:', innerTextResult.length, 'caracteres');
  
  return innerTextResult || texto.trim();
}

export default defineContentScript({
  matches: ['*://legislacao.prefeitura.sp.gov.br/*'],
  main() {
    console.log('[Content] Script injetado na página');
    injetarBotaoSimplificar();
  },
});

function injetarBotaoSimplificar() {
  console.log('[Content] Iniciando injeção do botão');
  
  if (document.readyState === 'loading') {
    console.log('[Content] Aguardando DOM carregar...');
    document.addEventListener('DOMContentLoaded', criarBotao);
  } else {
    console.log('[Content] DOM já carregado');
    criarBotao();
  }
}

function criarBotao() {
  console.log('[Content] Procurando container da página...');
  
  const containerDiv = document.querySelector('.col.s12.bx-content-links');
  
  if (!containerDiv) {
    console.error('[Content] ❌ Container não encontrado');
    return;
  }
  
  console.log('[Content] ✓ Container encontrado');

  const ulBxBtn = containerDiv.querySelector('ul.bx-btn');
  
  if (!ulBxBtn) {
    console.error('[Content] ❌ UL não encontrado');
    return;
  }
  
  console.log('[Content] ✓ UL encontrado');

  if (document.querySelector('#leiaFacil-botao-container')) {
    console.log('[Content] Botão já foi injetado');
    return;
  }

  const novoLi = document.createElement('li');
  novoLi.id = 'leiaFacil-botao-container';
  
  const link = document.createElement('a');
  link.href = '#';
  link.id = 'leiaFacil-simplificar';
  link.textContent = 'Simplificar';
  link.style.cursor = 'pointer';
  link.style.color = '#0056b3';
  
  link.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('[Content] Botão clicado!');
    
    const allCustomStyle = document.querySelectorAll('.customStyle');
    const conteudoDiv = allCustomStyle.length > 1 ? allCustomStyle[1] : allCustomStyle[0];
    
    if (!conteudoDiv) {
      console.error('[Content] ❌ Div de conteúdo não encontrado');
      alert('Conteúdo não encontrado na página');
      return;
    }
    
    console.log('[Content] ✓ Div encontrada (índice ' + (allCustomStyle.length > 1 ? '1' : '0') + ')');
    console.log('[Content] Altura (scrollHeight):', (conteudoDiv as HTMLElement).scrollHeight, 'px');
    
    const conteudo = extrairTextoCompleto(conteudoDiv);
    
    console.log('[Content] ✓ Conteúdo extraído - Tamanho total: ' + conteudo.length + ' caracteres');
    console.log('[Content] ========== CONTEÚDO COMPLETO ENVIADO ==========');
    console.log(conteudo);
    console.log('[Content] ========== FIM DO CONTEÚDO ==========');
    console.log('[Content] Enviando mensagem para background...');
    
    try {
      chrome.runtime.sendMessage(
        { action: 'abrirPopup', conteudo: conteudo },
        (response: any) => {
          if (chrome.runtime.lastError) {
            console.error('[Content] ❌ Erro ao enviar mensagem:', chrome.runtime.lastError.message);
          } else {
            console.log('[Content] ✓ Mensagem enviada com sucesso');
          }
        }
      );
    } catch (err) {
      console.error('[Content] ❌ Erro ao enviar mensagem:', err);
    }
  });
  
  novoLi.appendChild(link);
  ulBxBtn.appendChild(novoLi);
  
  console.log('[Content] ✅ Botão injetado com sucesso');
}
