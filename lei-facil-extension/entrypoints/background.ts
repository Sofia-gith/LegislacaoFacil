export default defineBackground(() => {
  console.log('[Background] Script iniciado');

  let conteudoArmazenado: string = '';

  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[Background] 📨 Mensagem recebida:', {
      action: request.action,
      sender: sender.url,
      timestamp: new Date().toISOString()
    });
    
    if (request.action === 'abrirPopup') {
      console.log('[Background] Ação: abrirPopup');
      
      if (request.conteudo) {
        conteudoArmazenado = request.conteudo;
        console.log('[Background] ✓ Conteúdo armazenado:', {
          tamanho: conteudoArmazenado.length,
          primeiros100: conteudoArmazenado.substring(0, 100)
        });
      }
      
      console.log('[Background] Abrindo popup...');
      browser.action.openPopup().then(() => {
        console.log('[Background] ✓ Popup aberto com sucesso');
      }).catch(err => {
        console.error('[Background] ❌ Erro ao abrir popup:', err);
      });
      
      sendResponse({ status: 'popup_pronto', tamanho: request.conteudo?.length || 0 });
    }
    
    if (request.action === 'obterConteudo') {
      console.log('[Background] 📦 Ação: obterConteudo');
      console.log('[Background] Conteúdo armazenado:', {
        tamanho: conteudoArmazenado.length,
        vazio: !conteudoArmazenado.trim()
      });
      console.log('[Background] Enviando resposta...');
      sendResponse({ conteudo: conteudoArmazenado });
      console.log('[Background] ✅ Resposta enviada');
    }
  });
  
  console.log('[Background] Listeners registrados');
});
