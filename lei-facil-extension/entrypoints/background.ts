export default defineBackground(() => {
  console.log('[Background] Script iniciado');

  let conteudoArmazenado: string = '';

  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[Background] Mensagem recebida:', request.action);
    
    if (request.action === 'abrirPopup') {
      console.log('[Background] Ação: abrirPopup');
      
      if (request.conteudo) {
        conteudoArmazenado = request.conteudo;
        console.log('[Background] ✓ Conteúdo armazenado:', conteudoArmazenado.length, 'caracteres');
      }
      
      sendResponse({ status: 'popup_pronto', tamanho: request.conteudo?.length || 0 });
    }
    
    if (request.action === 'obterConteudo') {
      console.log('[Background] Ação: obterConteudo');
      console.log('[Background] ✓ Enviando conteúdo:', conteudoArmazenado.length, 'caracteres');
      sendResponse({ conteudo: conteudoArmazenado });
    }
  });
  
  console.log('[Background] Listeners registrados');
});
