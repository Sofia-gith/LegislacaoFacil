declare const chrome: any;

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
    
    const conteudoDiv = document.querySelector('.col.s12.customStyle');
    
    if (!conteudoDiv) {
      console.error('[Content] ❌ Div de conteúdo não encontrado');
      alert('Conteúdo não encontrado na página');
      return;
    }
    
    const conteudo = (conteudoDiv as HTMLElement).innerText || conteudoDiv.textContent || '';
    
    console.log('[Content] ✓ Conteúdo extraído:', conteudo.length, 'caracteres');
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
