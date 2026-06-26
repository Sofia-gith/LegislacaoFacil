import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [conteudo, setConteudo] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [resposta, setResposta] = useState('');
  const [erro, setErro] = useState('');

  // Carregar conteúdo do background ao abrir o popup
  useEffect(() => {
    chrome.runtime.sendMessage({ action: 'obterConteudo' }, (response) => {
      if (response?.conteudo) {
        setConteudo(response.conteudo);
        console.log('LeiaFacil Popup: Conteúdo carregado');
      }
    });
  }, []);

  // Enviar para backend para simplificação
  const simplificar = async () => {
    if (!conteudo.trim()) {
      setErro('Nenhum conteúdo para simplificar');
      return;
    }

    setCarregando(true);
    setErro('');
    setResposta('');

    try {
      // Substitua pela URL do seu backend
      const resposta_api = await fetch('http://localhost:8000/simplificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: conteudo })
      });

      if (!resposta_api.ok) {
        throw new Error('Erro na API');
      }

      const dados = await resposta_api.json();
      setResposta(dados.texto_simplificado || dados.resultado || '');
    } catch (err) {
      setErro(String(err));
      console.error('LeiaFacil: Erro ao simplificar', err);
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
              Erro: {erro}
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
              <p><strong>Resultado Simplificado:</strong></p>
              <p style={{ fontSize: '13px', lineHeight: '1.5' }}>{resposta}</p>
            </div>
          )}
        </>
      ) : (
        <p style={{ color: '#666' }}>Carregando conteúdo...</p>
      )}
    </div>
  );
}

export default App;
