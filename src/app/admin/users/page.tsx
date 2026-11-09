import Link from "next/link";
import { listAdminUsers } from "@/features/auth/server/admin-users";
import { AccessState } from "../_components/access-state";
import { UsersTable } from "./users-table";

export default async function AdminUsersPage({
  searchParams,
}: PageProps<"/admin/users">) {
  const result = await listAdminUsers(await searchParams);
  if (!result.success && result.code !== "INVALID_INPUT")
    return <AccessState code={result.code} />;
  if (!result.success)
    return (
      <main id="main-content" className="admin-page">
        <h1>Usuários</h1>
        <p role="alert">Filtros inválidos.</p>
        <Link href="/admin/users">Limpar filtros</Link>
      </main>
    );
  const pageLink = (page: number) =>
    `/admin/users?${new URLSearchParams({ role: result.query.role, search: result.query.search, sort: result.query.sort, status: result.query.status, page: String(page) })}`;
  return (
    <main id="main-content" tabIndex={-1} className="admin-page">
      <p className="admin-eyebrow">Administração</p>
      <h1>Usuários</h1>
      <p className="text-muted">
        Consulte usuários e altere seus cargos. A alteração encerra as sessões
        da conta.
      </p>
      <form
        action="/admin/users"
        method="get"
        className="admin-panel grid min-w-0 grid-cols-1 items-end gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <label>
          Buscar por nome ou e-mail{" "}
          <input
            name="search"
            type="search"
            maxLength={100}
            defaultValue={result.query.search}
          />
        </label>
        <label>
          Cargo{" "}
          <select name="role" defaultValue={result.query.role}>
            <option value="">Todos</option>
            <option value="customer">Usuários comuns</option>
            <option value="admin">Administradores</option>
          </select>
        </label>
        <label>
          Cadastro{" "}
          <select name="sort" defaultValue={result.query.sort}>
            <option value="newest">Mais recentes</option>
            <option value="oldest">Mais antigos</option>
          </select>
        </label>
        <label>
          Status{" "}
          <select name="status" defaultValue={result.query.status}>
            <option value="">Todos</option>
            <option value="active">Ativos</option>
            <option value="suspended">Suspensos</option>
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-4 sm:col-span-2 xl:col-span-4">
          <button className="admin-action" type="submit">
            Filtrar
          </button>
          <Link href="/admin/users" className="auth-link">
            Limpar
          </Link>
        </div>
      </form>
      {result.users.length === 0 ? (
        <p className="admin-panel">Nenhum usuário encontrado.</p>
      ) : (
        <UsersTable users={result.users} actorId={result.actorId} />
      )}
      <nav aria-label="Paginação de usuários" className="flex gap-6">
        {result.query.page > 1 && (
          <Link className="auth-link" href={pageLink(result.query.page - 1)}>
            Anterior
          </Link>
        )}
        {result.hasNext && (
          <Link className="auth-link" href={pageLink(result.query.page + 1)}>
            Próxima
          </Link>
        )}
      </nav>
    </main>
  );
}
