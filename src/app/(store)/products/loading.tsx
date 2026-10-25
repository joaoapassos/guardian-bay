export default function ProductsLoading() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="store-page"
      aria-busy="true"
    >
      <output className="text-muted">Carregando produtos…</output>
      <div className="h-12 w-64 rounded bg-line/40" aria-hidden="true" />
      <div
        className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"
        aria-hidden="true"
      >
        {[1, 2, 3, 4, 5, 6, 7, 8].map((id) => (
          <div key={id} className="aspect-square rounded-panel bg-line/30" />
        ))}
      </div>
    </main>
  );
}
