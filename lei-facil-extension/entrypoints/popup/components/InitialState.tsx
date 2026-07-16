import { Zap, Clipboard, HelpCircle } from 'lucide-react';
import { ErrorMessage } from './ErrorMessage';
import { useEffect } from 'react';

interface InitialStateProps {
  conteudo: string;
  erro: string;
  carregando: boolean;
  onSimplificar: () => void;
}

export function InitialState({ conteudo, erro, carregando, onSimplificar }: InitialStateProps) {
  useEffect(() => {
    console.log('[InitialState] 🎨 Renderizado com conteúdo:', {
      tamanho: conteudo.length,
      vazio: !conteudo.trim(),
      preview: conteudo.substring(0, 50)
    });
  }, [conteudo]);

  const handleClick = () => {
    console.log('[InitialState.handleClick] 🖱️ Botão clicado!');
    onSimplificar();
  };
  return (
    <div className="lf-body">
      <div className="lf-detected-box">
        <p className="lf-detected-label">Norma detectada</p>
        <p className="lf-detected-text">
          {conteudo.substring(0, 120)}
          {conteudo.length > 120 ? '...' : ''}
        </p>
      </div>

      <p className="lf-desc">
        Textos de lei costumam ser difíceis de entender. Quer uma versão simplificada?
      </p>

      <div className="lf-feature-grid">
        <div className="lf-feature-card">
          <Zap size={20} className="lf-feature-icon" />
          <p className="lf-feature-label">Linguagem simples</p>
        </div>
        <div className="lf-feature-card">
          <Clipboard size={20} className="lf-feature-icon" />
          <p className="lf-feature-label">Pontos principais</p>
        </div>
        <div className="lf-feature-card">
          <HelpCircle size={20} className="lf-feature-icon" />
          <p className="lf-feature-label">O que muda pra mim?</p>
        </div>
      </div>

      <button
        className={`lf-btn-primary ${carregando ? 'lf-btn-primary--disabled' : ''}`}
        onClick={handleClick}
        disabled={carregando}
      >
        <Zap size={16} className="lf-icon-inline" />
        Simplificar esta lei
      </button>

      {erro && <ErrorMessage mensagem={erro} />}
    </div>
  );
}