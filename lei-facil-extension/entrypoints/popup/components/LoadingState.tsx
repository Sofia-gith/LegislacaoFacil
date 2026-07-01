export function LoadingState() {
  return (
    <div className="lf-loading-wrap">
      <div className="lf-dots-row">
        {[0, 1, 2].map((i) => (
          <div key={i} className="lf-dot" style={{ animationDelay: `${i * 0.2}s` }} />
        ))}
      </div>
      <p className="lf-loading-text">Analisando a lei, aguarde...</p>
    </div>
  );
}