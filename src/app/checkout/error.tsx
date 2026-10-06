"use client";
export default function CheckoutError({ retry }: { retry: () => void }) {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1>Checkout indisponível</h1>
      <p role="alert">Não foi possível revisar o checkout.</p>
      <button type="button" onClick={retry}>
        Tentar novamente
      </button>
    </main>
  );
}
