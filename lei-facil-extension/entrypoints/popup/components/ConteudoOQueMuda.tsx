import { AlertCircle, Loader } from 'lucide-react';
import type { RespostaStructurada } from '../types';

interface ConteudoOQueMudaProps {
  dados: RespostaStructurada | null;
  carregando: boolean;
  erro: string;
  onCarregar: () => void;
}

export function ConteudoOQueMuda({ dados, carregando, erro, onCarregar }: ConteudoOQueMudaProps) {
  if (carregando) {
    return (
      <div className="lf-tab-content">
        <div className="lf-loading-center">
          <Loader size={24} className="lf-spinner" />
          <p className="lf-loading-text">Analisando impacto para você...</p>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="lf-tab-content">
        <div className="lf-error-box">
          <AlertCircle size={16} className="lf-error-icon" />
          <p className="lf-error-text">{erro}</p>
        </div>
      </div>
    );
  }

  if (dados) {
    return (
      <div className="lf-tab-content">
        <div className="lf-scroll-container">
          <div className="lf-summary-box">
            <p className="lf-summary-label">Impacto</p>
            <p className="lf-summary-text">{dados.resumo}</p>
          </div>

          <div className="lf-corpo-box">
            <p className="lf-corpo-label">Detalhes</p>
            <div className="lf-corpo-text">{dados.corpo}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lf-tab-content">
      <div className="lf-cta-container">
        <AlertCircle size={28} className="lf-cta-icon" />
        <p className="lf-cta-title">Saiba como esta lei pode afetá-lo</p>
        <p className="lf-cta-desc">Clique abaixo para receber uma análise personalizada.</p>
        <button className="lf-btn-cta" onClick={onCarregar}>
          Analisar impacto
        </button>
      </div>
    </div>
  );
}
