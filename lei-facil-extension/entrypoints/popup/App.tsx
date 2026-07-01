import { Header } from './components/Header';
import { ErrorMessage } from './components/ErrorMessage';
import { LoadingContent } from './components/LoadingContent';
import { InitialState } from './components/InitialState';
import { LoadingState } from './components/LoadingState';
import { ResultState } from './components/ResultState';
import { useConteudoPagina } from './hooks/useConteudoPagina';
import { useSimplificar } from './hooks/useSimplificar';
import './App.css';

function App() {
  const { conteudo, erro: erroConteudo } = useConteudoPagina();
  const { carregando, resposta, erro, simplificar, limpar } = useSimplificar();

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
          onSimplificar={() => simplificar(conteudo)}
        />
      )}

      {carregando && <LoadingState />}

      {resposta && !carregando && (
        <ResultState resposta={resposta} erro={erro} onVoltar={limpar} />
      )}
    </div>
  );
}

export default App;