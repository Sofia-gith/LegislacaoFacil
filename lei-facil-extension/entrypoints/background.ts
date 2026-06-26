export default defineBackground(() => {
  console.log('LeiaFacil Background', { id: browser.runtime.id });

  // Armazenar conteúdo temporariamente
  let conteudoArmazenado: string = '';

  // Listener para mensagens do content script
  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'abrirPopup') {
      console.log('LeiaFacil: Solicitação para abrir popup');
      
      // Armazenar conteúdo
      if (request.conteudo) {
        conteudoArmazenado = request.conteudo;
        console.log('LeiaFacil: Conteúdo armazenado');
      }
      
      sendResponse({ status: 'popup_pronto', tamanho: request.conteudo?.length || 0 });
    }
    
    // Endpoint para o popup acessar o conteúdo
    if (request.action === 'obterConteudo') {
      sendResponse({ conteudo: conteudoArmazenado });
    }
  });
});
