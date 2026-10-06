import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuthenticatedAdmin } from "@/features/auth/server/require-admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Early UX guard; each privileged feature independently checks authorization.
  if (!(await requireAuthenticatedAdmin()).success) notFound();
  return (
    <>
      <nav
        aria-label="Backoffice"
        className="mx-auto flex w-full max-w-5xl gap-6 border-b px-6 py-4"
      >
        <Link href="/admin">Visão geral</Link>
        <Link href="/admin/catalog">Catálogo</Link>
        <Link href="/admin/orders">Pedidos</Link>
        <Link href="/admin/audit">Auditoria</Link>
      </nav>
      {children}
    </>
  );
}
