import { Header } from './components/Header';
import { ErrorMessage } from './components/ErrorMessage';
import { LoadingContent } from './components/LoadingContent';
import { InitialState } from './components/InitialState';
import { LoadingState } from './components/LoadingState';
import { TabsContainer } from './components/TabsContainer';
import { useConteudoPagina } from './hooks/useConteudoPagina';
import { useSimplificar } from './hooks/useSimplificar';
import { useEffect } from 'react';
import './App.css';

function App() {
  const { conteudo, erro: erroConteudo } = useConteudoPagina();
  const { carregando, resposta, erro, simplificar, carregarOQueMuda, limpar } = useSimplificar();

  useEffect(() => {
    console.log('[App] Renderizado!', {
      temConteudo: !!conteudo,
      tamanhoConteudo: conteudo?.length || 0,
      temErro: !!erroConteudo,
      temResposta: !!resposta,
      carregando
    });
  }, [conteudo, erroConteudo, resposta, carregando]);

  const handleSimplificar = () => {
    console.log('[App.handleSimplificar] ⚡ Função chamada!');
    console.log('[App.handleSimplificar] Conteúdo disponível:', {
      tamanho: conteudo?.length || 0,
      vazio: !conteudo?.trim(),
      tipo: typeof conteudo,
      isString: typeof conteudo === 'string'
    });
    
    if (!conteudo || !conteudo.trim()) {
      console.error('[App.handleSimplificar] ❌ Conteúdo vazio! Não chamando simplificar()');
      return;
    }
    
    console.log('[App.handleSimplificar] ✅ Chamando simplificar(conteudo)...');
    simplificar(conteudo);
  };

  return (
    <div className="lf-root">
      <Header />

      {!conteudo && !erroConteudo && <LoadingContent />}

      {!conteudo && erroConteudo && (
        <div className="lf-body">
          <ErrorMessage mensagem={erroConteudo} />
        </div>
      )}

      {conteudo && !resposta && !carregando && (
        <InitialState
          conteudo={conteudo}
          erro={erro}
          carregando={carregando}
          onSimplificar={handleSimplificar}
        />
      )}

      {carregando && <LoadingState />}

      {resposta && !carregando && (
        <TabsContainer
          linguagemSimples={resposta}
          onVoltar={limpar}
          onCarregarOQueMuda={() => carregarOQueMuda(conteudo)}
        />
      )}
    </div>
  );
}

export default App;