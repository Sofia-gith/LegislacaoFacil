import { useState } from 'react';
import { Copy, ArrowLeft } from 'lucide-react';
import { TabBar } from './TabBar';
import { ConteudoLinguagemSimples } from './ConteudoLinguagemSimples';
import { ConteudoPontosPrincipais } from './ConteudoPontosPrincipais';
import { ConteudoOQueMuda } from './ConteudoOQueMuda';
import type { AbaTipo, EstadoAbas, RespostaStructurada } from '../types';
import { ErrorMessage } from './ErrorMessage';

interface TabsContainerProps {
  linguagemSimples: RespostaStructurada;
  onVoltar: () => void;
  onCarregarOQueMuda: () => Promise<RespostaStructurada | null>;
}

export function TabsContainer({ linguagemSimples, onVoltar, onCarregarOQueMuda }: TabsContainerProps) {
  const [abaAtual, setAbaAtual] = useState<AbaTipo>('linguagem_simples');
  const [copiado, setCopiado] = useState(false);
  const [oQueMuda, setOQueMuda] = useState<RespostaStructurada | null>(null);
  const [carregandoOQueMuda, setCarregandoOQueMuda] = useState(false);
  const [erroOQueMuda, setErroOQueMuda] = useState('');

  const copiarResumo = () => {
    const textoCompleto = `${linguagemSimples.resumo}\n\n${linguagemSimples.corpo}`;
    navigator.clipboard.writeText(textoCompleto).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  };

  const aoCarregarOQueMuda = async () => {
    setCarregandoOQueMuda(true);
    setErroOQueMuda('');
    try {
      const resultado = await onCarregarOQueMuda();
      if (resultado) {
        setOQueMuda(resultado);
      } else {
        setErroOQueMuda('Não foi possível carregar os dados');
      }
    } catch (err) {
      setErroOQueMuda(err instanceof Error ? err.message : 'Erro ao carregar');
    } finally {
      setCarregandoOQueMuda(false);
    }
  };

  const renderizarConteudo = () => {
    switch (abaAtual) {
      case 'linguagem_simples':
        return <ConteudoLinguagemSimples dados={linguagemSimples} />;
      case 'pontos_principais':
        return <ConteudoPontosPrincipais dados={linguagemSimples} />;
      case 'o_que_muda_pra_mim':
        return (
          <ConteudoOQueMuda
            dados={oQueMuda}
            carregando={carregandoOQueMuda}
            erro={erroOQueMuda}
            onCarregar={aoCarregarOQueMuda}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <TabBar abaAtual={abaAtual} aoMudar={setAbaAtual} temDados={true} carregandoOQueMuda={carregandoOQueMuda} />

      <div className="lf-body">
        {renderizarConteudo()}
      </div>

      <div className="lf-footer">
        <button className="lf-btn-secondary" onClick={onVoltar}>
          <ArrowLeft size={14} className="lf-icon-inline" />
          Voltar
        </button>
        <button
          className={`lf-btn-copy ${copiado ? 'lf-btn-copy--done' : ''}`}
          onClick={copiarResumo}
        >
          <Copy size={14} className="lf-icon-inline" />
          {copiado ? 'Copiado!' : 'Copiar'}
        </button>
      </div>
    </>
  );
}
