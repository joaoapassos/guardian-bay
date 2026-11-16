import Link from "next/link";
import { requireAuthenticatedAdmin } from "@/features/auth/server/require-admin";
import { AccessState } from "../../_components/access-state";
import { CreateUserForm } from "./create-user-form";

export default async function NewUserPage() {
  const access = await requireAuthenticatedAdmin();
  if (!access.success) return <AccessState code={access.code} />;
  return (
    <main id="main-content" tabIndex={-1} className="admin-page">
      <Link href="/admin/users" className="auth-link">
        Voltar aos usuários
      </Link>
      <h1>Cadastrar usuário</h1>
      <CreateUserForm />
    </main>
  );
}
