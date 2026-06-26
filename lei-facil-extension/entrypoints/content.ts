export default defineContentScript({
  matches: ['*://legislacao.prefeitura.sp.gov.br/*'],
  main() {
    injetarBotaoSimplificar();
  },
});

function injetarBotaoSimplificar() {
  // Aguardar DOM carregar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', criarBotao);
  } else {
    criarBotao();
  }
}

function criarBotao() {
  // Encontrar container: div com class "col s12 bx-content-links"
  const containerDiv = document.querySelector('.col.s12.bx-content-links');
  
  if (!containerDiv) {
    console.log('LeiaFacil: Container não encontrado');
    return;
  }

  // Encontrar a ul dentro com class "bx-btn"
  const ulBxBtn = containerDiv.querySelector('ul.bx-btn');
  
  if (!ulBxBtn) {
    console.log('LeiaFacil: UL não encontrado');
    return;
  }

  // Verificar se já foi injetado
  if (document.querySelector('#leiaFacil-botao-container')) {
    return;
  }

  // Criar novo <li> com botão
  const novoLi = document.createElement('li');
  novoLi.id = 'leiaFacil-botao-container';
  
  const link = document.createElement('a');
  link.href = '#';
  link.id = 'leiaFacil-simplificar';
  link.textContent = 'Simplificar';
  link.style.cursor = 'pointer';
  link.style.color = '#0056b3';
  
  // Evento: extrair conteúdo e abrir popup ao clicar
  link.addEventListener('click', (e) => {
    e.preventDefault();
    
    // Extrair conteúdo do div com class "col s12 customStyle"
    const conteudoDiv = document.querySelector('.col.s12.customStyle');
    
    if (!conteudoDiv) {
      console.log('LeiaFacil: Div de conteúdo não encontrado');
      alert('Conteúdo não encontrado na página');
      return;
    }
    
    // Obter o texto do elemento
    const conteudo = conteudoDiv.innerText || conteudoDiv.textContent;
    
    console.log('LeiaFacil: Conteúdo extraído, tamanho:', conteudo.length, 'caracteres');
    
    // Enviar conteúdo para o background/popup
    chrome.runtime.sendMessage(
      { action: 'abrirPopup', conteudo: conteudo },
      (response) => {
        console.log('LeiaFacil: Popup aberto com conteúdo');
      }
    );
  });
  
  novoLi.appendChild(link);
  ulBxBtn.appendChild(novoLi);
  
  console.log('LeiaFacil: Botão injetado com sucesso');
}
