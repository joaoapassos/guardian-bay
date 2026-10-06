"use client";
export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <p role="alert">Não foi possível carregar a administração.</p>
      <button type="button" onClick={reset}>
        Tentar novamente
      </button>
    </main>
  );
}
