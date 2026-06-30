import { useState, useEffect } from 'react';
import { 
  FileText, CheckCircle, AlertCircle, Loader, BarChart3, 
  Scale, Zap, Clipboard, HelpCircle, Copy, ArrowLeft
} from 'lucide-react';
import './App.css';

declare const chrome: any;

function App() {
  const [conteudo, setConteudo] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [resposta, setResposta] = useState('');
  const [erro, setErro] = useState('');
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    console.log('[Popup] Componente montado');

    chrome.runtime.sendMessage({ action: 'obterConteudo' }, (response: any) => {
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

    console.log('[Popup] ========== CONTEÚDO COMPLETO A ENVIAR PARA BACKEND ==========');
    console.log('[Popup] Tamanho total: ' + conteudo.length + ' caracteres');
    console.log(conteudo);
    console.log('[Popup] ========== FIM DO CONTEÚDO ==========');

    try {
      console.log('[Popup] Enviando requisição para backend...');
      console.log('[Popup] URL: http://localhost:8000/simplificar');
      console.log('[Popup] Tamanho do texto:', conteudo.length, 'caracteres');

      const resposta_api = await fetch('http://localhost:8000/simplificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: conteudo })
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

  const copiarResposta = () => {
    navigator.clipboard.writeText(resposta).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  };

  const voltar = () => {
    setResposta('');
    setErro('');
  };

  // ── estilos inline ──────────────────────────────────────────────────────────
  const s = {
    root: {
      width: '420px',
      fontFamily: 'Inter, system-ui, Arial, sans-serif',
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      overflow: 'hidden',
      border: '1px solid #e2e8f0',
    },
    header: {
      background: '#1a56a0',
      padding: '14px 18px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    headerIcon: {
      width: '28px',
      height: '28px',
      background: 'white',
      borderRadius: '6px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '15px',
      flexShrink: 0,
    },
    headerTitle: {
      color: 'white',
      fontWeight: 600,
      fontSize: '15px',
      margin: 0,
    },
    body: { padding: '18px' },
    detectedBox: {
      background: '#f0f6ff',
      borderLeft: '3px solid #1a56a0',
      borderRadius: '6px',
      padding: '10px 13px',
      marginBottom: '14px',
    },
    detectedLabel: {
      fontSize: '10px',
      color: '#64748b',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
      margin: '0 0 3px',
    },
    detectedText: {
      fontSize: '12px',
      color: '#1e293b',
      margin: 0,
      lineHeight: 1.5,
    },
    desc: {
      fontSize: '13px',
      color: '#475569',
      margin: '0 0 16px',
      lineHeight: 1.6,
    },
    featureGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '8px',
      marginBottom: '16px',
    },
    featureCard: {
       background: '#f8fafc',
       borderRadius: '8px',
       padding: '10px 8px',
       textAlign: 'center' as const,
       border: '1px solid #e2e8f0',
     },
    featureLabel: { fontSize: '11px', color: '#64748b', margin: 0, lineHeight: 1.3 },
    btnPrimary: {
      width: '100%',
      padding: '11px',
      background: carregando ? '#93b4d4' : '#1a56a0',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: carregando ? 'not-allowed' : 'pointer',
      fontSize: '14px',
      fontWeight: 600,
      letterSpacing: '0.2px',
      transition: 'background 0.2s',
    },
    loadingWrap: {
      padding: '32px 18px',
      textAlign: 'center' as const,
    },
    dotsRow: {
      display: 'flex',
      justifyContent: 'center',
      gap: '6px',
      marginBottom: '14px',
    },
    loadingText: { fontSize: '13px', color: '#64748b', margin: 0 },
    resultHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '14px',
    },
    resultTitle: { fontSize: '13px', fontWeight: 600, color: '#1e293b', margin: 0 },
    badge: {
      fontSize: '11px',
      background: '#dcfce7',
      color: '#15803d',
      borderRadius: '20px',
      padding: '2px 10px',
    },
    summaryBox: {
      background: '#f0f6ff',
      borderLeft: '3px solid #1a56a0',
      borderRadius: '6px',
      padding: '12px 14px',
      marginBottom: '12px',
    },
    summaryLabel: {
      fontSize: '11px',
      fontWeight: 600,
      color: '#1a56a0',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.4px',
      margin: '0 0 6px',
    },
    summaryText: {
      fontSize: '13px',
      color: '#1e293b',
      margin: 0,
      lineHeight: 1.7,
      whiteSpace: 'pre-wrap' as const,
      wordBreak: 'break-word' as const,
    },
    footer: {
      padding: '12px 18px 16px',
      borderTop: '1px solid #e2e8f0',
      display: 'flex',
      gap: '8px',
    },
    btnSecondary: {
      flex: 1,
      padding: '9px',
      background: '#f1f5f9',
      color: '#475569',
      border: '1px solid #e2e8f0',
      borderRadius: '7px',
      fontSize: '13px',
      fontWeight: 500,
      cursor: 'pointer',
    },
    btnCopy: {
      flex: 2,
      padding: '9px',
      background: copiado ? '#15803d' : '#1a56a0',
      color: 'white',
      border: 'none',
      borderRadius: '7px',
      fontSize: '13px',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'background 0.2s',
    },
    errorBox: {
      background: '#fef2f2',
      borderLeft: '3px solid #ef4444',
      borderRadius: '6px',
      padding: '10px 13px',
      marginTop: '12px',
    },
    errorText: { fontSize: '12px', color: '#b91c1c', margin: 0, lineHeight: 1.5 },
    skeletonLine: (w: string) => ({
      height: '10px',
      background: '#e2e8f0',
      borderRadius: '4px',
      width: w,
      marginBottom: '8px',
      animation: 'pulse 1.5s ease-in-out infinite',
    }),
  };

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <div style={s.root}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerIcon}>
          <Scale size={18} color="#1a56a0" />
        </div>
        <p style={s.headerTitle}>LeiaFácil</p>
      </div>

      {/* Carregando conteúdo inicial */}
      {!conteudo && !erro && (
        <div style={s.body}>
          <div style={s.skeletonLine('60%')} />
          <div style={s.skeletonLine('80%')} />
          <div style={s.skeletonLine('50%')} />
          <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', marginTop: '8px' }}>
            Carregando conteúdo da página...
          </p>
        </div>
      )}

      {/* Erro ao carregar conteúdo */}
       {!conteudo && erro && (
         <div style={s.body}>
           <div style={s.errorBox}>
             <p style={s.errorText}>
               <AlertCircle size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
               {erro}
             </p>
           </div>
         </div>
       )}

      {/* Estado inicial — conteúdo carregado, aguardando simplificar */}
      {conteudo && !resposta && !carregando && (
        <div style={s.body}>
          <div style={s.detectedBox}>
            <p style={s.detectedLabel}>Norma detectada</p>
            <p style={s.detectedText}>
              {conteudo.substring(0, 120)}{conteudo.length > 120 ? '...' : ''}
            </p>
          </div>

          <p style={s.desc}>
            Essa lei pode ser difícil de entender. Clique abaixo para receber
            uma versão simples, sem jargões jurídicos.
          </p>

          <div style={s.featureGrid}>
            <div style={s.featureCard}>
              <Zap size={20} style={{ margin: '0 auto 4px', display: 'block', color: '#1a56a0' }} />
              <p style={s.featureLabel}>Linguagem simples</p>
            </div>
            <div style={s.featureCard}>
              <Clipboard size={20} style={{ margin: '0 auto 4px', display: 'block', color: '#1a56a0' }} />
              <p style={s.featureLabel}>Pontos principais</p>
            </div>
            <div style={s.featureCard}>
              <HelpCircle size={20} style={{ margin: '0 auto 4px', display: 'block', color: '#1a56a0' }} />
              <p style={s.featureLabel}>O que muda pra mim?</p>
            </div>
          </div>

          <button style={s.btnPrimary} onClick={simplificar} disabled={carregando}>
            <Zap size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
            Simplificar esta lei
          </button>

          {erro && (
            <div style={s.errorBox}>
              <p style={s.errorText}>
                <AlertCircle size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
                {erro}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Loading — aguardando resposta do backend */}
      {carregando && (
        <div style={s.loadingWrap}>
          <style>{`
            @keyframes bounce {
              0%, 80%, 100% { transform: translateY(0); opacity: 0.3; }
              40% { transform: translateY(-8px); opacity: 1; }
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.4; }
            }
          `}</style>
          <div style={s.dotsRow}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: '10px', height: '10px', borderRadius: '50%',
                background: '#1a56a0',
                animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
          <p style={s.loadingText}>Analisando a lei, aguarde...</p>
        </div>
      )}

      {/* Resultado */}
      {resposta && !carregando && (
        <>
          <div style={s.body}>
            <div style={s.resultHeader}>
              <p style={s.resultTitle}>Resumo simplificado</p>
              <span style={s.badge}>
                <CheckCircle size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
                Pronto
              </span>
            </div>

            <div style={s.summaryBox}>
              <p style={s.summaryLabel}>
                <FileText size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
                Versão simplificada
              </p>
              <p style={s.summaryText}>{resposta}</p>
            </div>

            {erro && (
              <div style={s.errorBox}>
                <p style={s.errorText}>
                  <AlertCircle size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
                  {erro}
                </p>
              </div>
            )}
          </div>

          <div style={s.footer}>
            <button style={s.btnSecondary} onClick={voltar}>
              <ArrowLeft size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
              Voltar
            </button>
            <button style={s.btnCopy} onClick={copiarResposta}>
              <Copy size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
              {copiado ? 'Copiado!' : 'Copiar resumo'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default App;