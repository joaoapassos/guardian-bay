"use client";

export default function CartError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-semibold">Carrinho indisponível</h1>
      <p>Não foi possível carregar o carrinho. Tente novamente.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded border px-4 py-2"
      >
        Tentar novamente
      </button>
    </main>
  );
}
