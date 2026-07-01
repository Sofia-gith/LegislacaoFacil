import { useState } from 'react';
import { FileText, CheckCircle, Copy, ArrowLeft } from 'lucide-react';
import { ErrorMessage } from './ErrorMessage';

interface ResultStateProps {
  resposta: string;
  erro: string;
  onVoltar: () => void;
}

export function ResultState({ resposta, erro, onVoltar }: ResultStateProps) {
  const [copiado, setCopiado] = useState(false);

  const copiarResposta = () => {
    navigator.clipboard.writeText(resposta).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  };

  return (
    <>
      <div className="lf-body">
        <div className="lf-result-header">
          <p className="lf-result-title">Resumo simplificado</p>
          <span className="lf-badge">
            <CheckCircle size={14} className="lf-icon-inline" />
            Pronto
          </span>
        </div>

        <div className="lf-summary-box">
          <p className="lf-summary-label">
            <FileText size={14} className="lf-icon-inline" />
            Versão simplificada
          </p>
          <p className="lf-summary-text">{resposta}</p>
        </div>

        {erro && <ErrorMessage mensagem={erro} />}
      </div>

      <div className="lf-footer">
        <button className="lf-btn-secondary" onClick={onVoltar}>
          <ArrowLeft size={14} className="lf-icon-inline" />
          Voltar
        </button>
        <button
          className={`lf-btn-copy ${copiado ? 'lf-btn-copy--done' : ''}`}
          onClick={copiarResposta}
        >
          <Copy size={14} className="lf-icon-inline" />
          {copiado ? 'Copiado!' : 'Copiar resumo'}
        </button>
      </div>
    </>
  );
}