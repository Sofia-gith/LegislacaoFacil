import { AbaTipo } from '../types';

interface TabBarProps {
  abaAtual: AbaTipo;
  aoMudar: (aba: AbaTipo) => void;
  temDados: boolean;
  carregandoOQueMuda: boolean;
}

export function TabBar({ abaAtual, aoMudar, temDados, carregandoOQueMuda }: TabBarProps) {
  if (!temDados) return null;

  const abas: { id: AbaTipo; label: string }[] = [
    { id: 'linguagem_simples', label: 'Linguagem simples' },
    { id: 'pontos_principais', label: 'Pontos principais' },
    { id: 'o_que_muda_pra_mim', label: 'O que muda pra mim?' },
  ];

  return (
    <div className="lf-tabs">
      {abas.map((aba) => (
        <button
          key={aba.id}
          className={`lf-tab-button ${abaAtual === aba.id ? 'lf-tab-button--active' : ''} ${
            aba.id === 'o_que_muda_pra_mim' && carregandoOQueMuda ? 'lf-tab-button--loading' : ''
          }`}
          onClick={() => aoMudar(aba.id)}
          disabled={aba.id === 'o_que_muda_pra_mim' && carregandoOQueMuda}
        >
          {aba.label}
        </button>
      ))}
    </div>
  );
}
