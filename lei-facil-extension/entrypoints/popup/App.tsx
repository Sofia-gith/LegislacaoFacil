import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [conteudo, setConteudo] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [resposta, setResposta] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    console.log('[Popup] Componente montado');
    
    chrome.runtime.sendMessage({ action: 'obterConteudo' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[Popup] ❌ Erro ao obter conteúdo:', chrome.runtime.lastError.message);
        setErro('Erro ao comunicar com extensão');
        return;
      }
      
      if (response?.conteudo) {
        console.log('[Popup] ✓ Conteúdo recebido:', response.conteudo.length, 'caracteres');
        setConteudo(response.conteudo);
      } else {
        console.warn('[Popup] ⚠ Resposta vazia ou sem conteúdo');
        setErro('Nenhum conteúdo extraído');
      }
    });
  }, []);

  const simplificar = async () => {
    console.log('[Popup] Iniciando simplificação...');
    
    if (!conteudo.trim()) {
      console.error('[Popup] ❌ Conteúdo vazio');
      setErro('Nenhum conteúdo para simplificar');
      return;
    }

    setCarregando(true);
    setErro('');
    setResposta('');

    try {
      console.log('[Popup] Enviando requisição para backend...');
      console.log('[Popup] URL: http://localhost:8000/simplificar');
      console.log('[Popup] Tamanho do texto:', conteudo.length, 'caracteres');
      
      const resposta_api = await fetch('http://localhost:8000/simplificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: conteudo })
      });

      console.log('[Popup] Resposta recebida - Status:', resposta_api.status);

      if (!resposta_api.ok) {
        console.error('[Popup] ❌ Erro na resposta:', resposta_api.statusText);
        throw new Error(`Erro ${resposta_api.status}: ${resposta_api.statusText}`);
      }

      const dados = await resposta_api.json();
      console.log('[Popup] ✓ Dados recebidos:', dados);
      
      if (!dados.texto_simplificado) {
        console.warn('[Popup] ⚠ Resposta sem campo texto_simplificado');
        console.log('[Popup] Dados recebidos:', dados);
        throw new Error('Resposta do servidor inválida');
      }
      
      console.log('[Popup] ✓ Simplificação bem-sucedida');
      setResposta(dados.texto_simplificado);
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : String(err);
      console.error('[Popup] ❌ Erro:', mensagem);
      setErro(mensagem);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div style={{ width: '500px', padding: '15px', fontFamily: 'Arial, sans-serif' }}>
      <h2>LeiaFácil</h2>

      {conteudo ? (
        <>
          <div style={{
            border: '1px solid #ccc',
            padding: '10px',
            marginBottom: '10px',
            maxHeight: '150px',
            overflowY: 'auto',
            backgroundColor: '#f9f9f9'
          }}>
            <p><strong>Conteúdo detectado ({conteudo.length} caracteres):</strong></p>
            <p style={{ fontSize: '12px', color: '#666' }}>
              {conteudo.substring(0, 200)}...
            </p>
          </div>

          <button
            onClick={simplificar}
            disabled={carregando}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#0056b3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: carregando ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            {carregando ? '⏳ Simplificando...' : '✨ Simplificar'}
          </button>

          {erro && (
            <div style={{
              marginTop: '10px',
              padding: '10px',
              backgroundColor: '#f8d7da',
              color: '#721c24',
              borderRadius: '4px',
              fontSize: '12px'
            }}>
              ❌ Erro: {erro}
            </div>
          )}

          {resposta && (
            <div style={{
              marginTop: '10px',
              padding: '10px',
              backgroundColor: '#d4edda',
              color: '#155724',
              borderRadius: '4px',
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              <p><strong>✓ Resultado Simplificado:</strong></p>
              <p style={{ fontSize: '13px', lineHeight: '1.5' }}>{resposta}</p>
            </div>
          )}
        </>
      ) : (
        <div style={{ color: '#666', padding: '20px', textAlign: 'center' }}>
          <p>⏳ Carregando conteúdo...</p>
          {erro && <p style={{ color: 'red', fontSize: '12px' }}>Erro: {erro}</p>}
        </div>
      )}
    </div>
  );
}

export default App;
