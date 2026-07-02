import { FileText } from 'lucide-react';
import type { RespostaStructurada } from '../types';
import { TextoFormatado } from './TextoFormatado';

interface ConteudoLinguagemSimplesProps {
  dados: RespostaStructurada;
}

export function ConteudoLinguagemSimples({ dados }: ConteudoLinguagemSimplesProps) {
  return (
    <div className="lf-tab-content">
      <div className="lf-scroll-container">
        <div className="lf-summary-box">
          <p className="lf-summary-label">
            <FileText size={14} className="lf-icon-inline" />
            Resumo
          </p>
          <p className="lf-summary-text">{dados.resumo}</p>
        </div>

        <div className="lf-corpo-box">
          <p className="lf-corpo-label">Texto simplificado</p>
          <div className="lf-corpo-text">
            <TextoFormatado conteudo={dados.corpo} />
          </div>
        </div>
      </div>
    </div>
  );
}
