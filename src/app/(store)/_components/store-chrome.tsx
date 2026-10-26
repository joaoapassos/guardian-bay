"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export function StoreChrome({
  header,
  footer,
  children,
}: {
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const checkout = path === "/checkout";
  const auth = path === "/login" || path === "/register";
  return (
    <>
      {checkout ? (
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-surface px-5 py-5 font-auth sm:px-10">
          <Link
            href="/"
            className="font-editorial text-2xl font-extrabold text-coast"
          >
            GUARDIAN BAY
          </Link>
          <Link href="/cart" className="auth-link">
            Voltar ao carrinho
          </Link>
        </header>
      ) : auth ? (
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-paper px-5 py-4 font-auth sm:px-10">
          <Link
            href="/"
            className="font-editorial text-2xl font-extrabold text-coast"
          >
            GUARDIAN BAY
          </Link>
          <nav
            aria-label="Navegação da autenticação"
            className="flex gap-5 text-sm text-coast"
          >
            <Link className="store-nav-link" href="/products">
              Produtos
            </Link>
            <Link className="store-nav-link" href="/login">
              Entrar
            </Link>
            <Link className="store-nav-link" href="/register">
              Criar conta
            </Link>
          </nav>
        </header>
      ) : (
        header
      )}
      {children}
      {checkout ? (
        <footer className="border-t border-line px-5 py-6 text-center font-auth text-sm text-muted">
          <nav
            aria-label="Ajuda e políticas do checkout"
            className="mb-4 flex flex-wrap justify-center gap-x-6 gap-y-2"
          >
            <Link className="store-nav-link" href="/ajuda">
              Ajuda
            </Link>
            <Link className="store-nav-link" href="/privacidade">
              Privacidade
            </Link>
            <Link className="store-nav-link" href="/termos">
              Termos de Uso
            </Link>
            <Link className="store-nav-link" href="/trocas-e-devolucoes">
              Trocas e Devoluções
            </Link>
          </nav>
          Compra acadêmica · Pagamento exclusivamente simulado, sem movimentação
          financeira.
        </footer>
      ) : path === "/login" || path === "/register" ? null : (
        footer
      )}
    </>
  );
}
