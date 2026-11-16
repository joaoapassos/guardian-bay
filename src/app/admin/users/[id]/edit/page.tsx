import Link from "next/link";
import { notFound } from "next/navigation";
import { adminUserDetail } from "@/features/auth/server/admin-users";
import { AccessState } from "../../../_components/access-state";
import { EditUserForm } from "./edit-user-form";

export default async function EditUserPage({
  params,
}: PageProps<"/admin/users/[id]/edit">) {
  const { id } = await params;
  const result = await adminUserDetail(id);
  if (!result.success) {
    if (result.code === "NOT_FOUND") notFound();
    return <AccessState code={result.code} />;
  }
  if (result.actorId === id) return <AccessState code="FORBIDDEN" />;
  return (
    <main id="main-content" tabIndex={-1} className="admin-page">
      <Link href={`/admin/users/${id}`} className="auth-link">
        Voltar ao usuário
      </Link>
      <h1>Editar usuário</h1>
      <EditUserForm id={id} name={result.user.name} email={result.user.email} />
    </main>
  );
}
