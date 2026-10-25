export default function StoreLoading() {
  return (
    <main id="main-content" tabIndex={-1} className="store-page">
      <output className="block text-sm text-muted">Carregando página…</output>
      <div aria-hidden="true" className="space-y-6">
        <div className="h-12 w-2/3 max-w-md rounded-control bg-line/40" />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-64 rounded-panel border border-line bg-surface" />
          <div className="h-64 rounded-panel border border-line bg-surface" />
        </div>
      </div>
    </main>
  );
}
