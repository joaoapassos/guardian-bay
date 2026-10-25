export default function AdminLoading() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto max-w-5xl px-6 py-12"
    >
      <output aria-live="polite">Carregando administração…</output>
    </main>
  );
}
