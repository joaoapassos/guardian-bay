"use client";
export default function OrdersError({ retry }: { retry: () => void }) {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <p role="alert">Não foi possível carregar pedidos.</p>
      <button type="button" onClick={retry}>
        Tentar novamente
      </button>
    </main>
  );
}
