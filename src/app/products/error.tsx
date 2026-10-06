"use client";

export default function ProductsError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <p role="alert">Não foi possível carregar o catálogo.</p>
      <button type="button" onClick={reset}>
        Tentar novamente
      </button>
    </main>
  );
}
