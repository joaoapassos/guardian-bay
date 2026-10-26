import Link from "next/link";
export function StoreFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-surface px-5 py-10 font-auth sm:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <Link
            href="/"
            className="font-editorial text-2xl font-extrabold text-coast"
          >
            GUARDIAN BAY
          </Link>
          <p className="mt-3 max-w-xs leading-relaxed text-muted">
            Mais tranquilidade para o dia a dia. Preparado para tudo.
          </p>
          <Link className="store-nav-link mt-3" href="/sobre">
            Sobre o Guardian Bay
          </Link>
        </div>
        <nav aria-label="Explorar" className="space-y-3">
          <h2 className="font-semibold">Explorar</h2>
          <Link className="store-nav-link block" href="/products">
            Produtos
          </Link>
          <Link className="store-nav-link block" href="/cart">
            Carrinho
          </Link>
        </nav>
        <nav aria-label="Ajuda" className="space-y-3">
          <h2 className="font-semibold">Ajuda</h2>
          <Link className="store-nav-link block" href="/ajuda">
            Central de Ajuda
          </Link>
        </nav>
        <nav aria-label="Políticas" className="space-y-3">
          <h2 className="font-semibold">Políticas</h2>
          <Link className="store-nav-link block" href="/privacidade">
            Privacidade
          </Link>
          <Link className="store-nav-link block" href="/termos">
            Termos de Uso
          </Link>
          <Link className="store-nav-link block" href="/trocas-e-devolucoes">
            Trocas e Devoluções
          </Link>
          <p className="text-xs leading-relaxed text-muted">
            Documentos em elaboração.
          </p>
        </nav>
        <nav aria-label="Sua conta" className="space-y-3">
          <h2 className="font-semibold">Sua conta</h2>
          <Link className="store-nav-link block" href="/account">
            Meu perfil
          </Link>
          <Link className="store-nav-link block" href="/orders">
            Meus pedidos
          </Link>
        </nav>
      </div>
      <p className="mx-auto mt-8 max-w-7xl border-t border-line pt-5 text-sm text-muted">
        Projeto acadêmico. Todos os pagamentos são simulados; nenhum dinheiro é
        movimentado.
      </p>
    </footer>
  );
}
