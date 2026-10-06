import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuthenticatedAdmin } from "@/features/auth/server/require-admin";

export default async function AdminPage() {
  if (!(await requireAuthenticatedAdmin()).success) notFound();
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-12">
      <h1 className="text-3xl font-semibold">Backoffice</h1>
      <p>
        Área operacional administrativa. Cada operação verifica sua autorização
        no servidor.
      </p>
      <section className="rounded border p-6">
        <h2 className="text-2xl font-semibold">
          <Link href="/admin/catalog" className="underline">
            Catálogo e estoque
          </Link>
        </h2>
        <p>
          Gerencie categorias, produtos, publicação e quantidade disponível.
          Conflitos exigem atualizar os dados.
        </p>
      </section>
      <section className="rounded border p-6">
        <h2 className="text-2xl font-semibold">
          <Link href="/admin/orders" className="underline">
            Pedidos
          </Link>
        </h2>
        <p>
          Consulte pedidos e seus snapshots comerciais. Pagamento acadêmico; sem
          edição do histórico.
        </p>
      </section>
    </main>
  );
}
