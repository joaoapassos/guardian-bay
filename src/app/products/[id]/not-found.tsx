import Link from "next/link";

export default function ProductNotFound() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-semibold">Produto não encontrado</h1>
      <Link href="/products">Voltar aos produtos</Link>
    </main>
  );
}
