import Link from "next/link";
import { UserMenu } from "@/features/auth/components/user-menu";
import { requireAuthenticatedAdmin } from "@/features/auth/server/require-admin";
import { getAuthenticatedIdentity } from "@/features/auth/server/session-cookie";
export async function StoreHeader() {
  const identity = await getAuthenticatedIdentity();
  const canAccessAdmin = identity
    ? (await requireAuthenticatedAdmin()).success
    : false;
  return (
    <header className="border-b border-line bg-paper px-5 py-4 text-ink sm:px-10">
      <nav
        aria-label="Navegação principal"
        className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4"
      >
        <Link
          href="/"
          className="rounded-sm font-editorial text-xl font-extrabold tracking-tight text-coast focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-coast sm:text-2xl"
        >
          GUARDIAN BAY
        </Link>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 font-auth text-sm [&>a]:inline-flex [&>a]:min-h-11 [&>a]:items-center [&>a]:rounded-sm [&>a]:text-coast [&>a]:underline-offset-4 [&>a:hover]:underline [&>a:focus-visible]:outline-2 [&>a:focus-visible]:outline-offset-4 [&>a:focus-visible]:outline-coast">
          <Link href="/products">Produtos</Link>
          {identity ? (
            <>
              <Link href="/cart">Carrinho</Link>
              <UserMenu
                label={identity.email}
                canAccessAdmin={canAccessAdmin}
              />
            </>
          ) : (
            <>
              <Link href="/login">Entrar</Link>
              <Link href="/register">Criar conta</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
