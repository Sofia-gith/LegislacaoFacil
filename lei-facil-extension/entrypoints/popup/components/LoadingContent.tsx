export function LoadingContent() {
  return (
    <div className="lf-body">
      <div className="lf-skeleton" style={{ width: '60%' }} />
      <div className="lf-skeleton" style={{ width: '80%' }} />
      <div className="lf-skeleton" style={{ width: '50%' }} />
      <p className="lf-loading-hint">Carregando conteúdo da página...</p>
    </div>
  );
}