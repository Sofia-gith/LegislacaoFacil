import { CheckCircle2 } from 'lucide-react';
import type { RespostaStructurada } from '../types';
import { formatarInlineTags } from '../utils/formatacao';

interface ConteudoPontosPrincipaisProps {
  dados: RespostaStructurada;
}

export function ConteudoPontosPrincipais({ dados }: ConteudoPontosPrincipaisProps) {
  return (
    <div className="lf-tab-content">
      <div className="lf-scroll-container">
        <ul className="lf-pontos-lista">
          {dados.pontos.map((ponto, idx) => (
            <li key={idx} className="lf-ponto-item">
              <CheckCircle2 size={16} className="lf-ponto-icon" />
              <span className="lf-ponto-text">{formatarInlineTags(ponto)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
