import Link from "next/link";
import type { ReactNode } from "react";

export function InstitutionalShell({
  title,
  description,
  sections,
  draft = false,
  children,
}: {
  title: string;
  description: string;
  sections: readonly { id: string; title: string }[];
  draft?: boolean;
  children: ReactNode;
}) {
  return (
    <main id="main-content" tabIndex={-1} className="store-page">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/" className="auth-link">
          Home
        </Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">{title}</span>
      </nav>
      <header className="max-w-3xl space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">
          Guardian Bay · Informação e cuidado
        </p>
        <h1 className="store-title">{title}</h1>
        <p className="text-lg leading-relaxed text-muted">{description}</p>
        {draft && (
          <div className="rounded-control border border-line bg-surface p-5 text-sm leading-relaxed">
            <p className="font-semibold text-coast">Em elaboração</p>
            <p className="mt-2">
              Este conteúdo apresenta o estado atual do projeto e os assuntos
              que ainda precisam de definição. Não é uma política definitiva
              aprovada. Não há data de vigência ou versão final estabelecida.
            </p>
          </div>
        )}
      </header>
      <div className="grid items-start gap-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12">
        <nav
          aria-label="Nesta página"
          className="rounded-panel border border-line bg-surface p-5"
        >
          <h2 className="font-semibold">Nesta página</h2>
          <ul className="mt-3 space-y-2">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  className="store-nav-link break-words"
                  href={`#${section.id}`}
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="institutional-content min-w-0 max-w-3xl space-y-10">
          {children}
        </div>
      </div>
      <nav
        aria-label="Ajuda e documentos relacionados"
        className="flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-6 text-sm"
      >
        <Link href="/ajuda" className="store-nav-link">
          Central de Ajuda
        </Link>
        <Link href="/privacidade" className="store-nav-link">
          Privacidade
        </Link>
        <Link href="/termos" className="store-nav-link">
          Termos de Uso
        </Link>
        <Link href="/trocas-e-devolucoes" className="store-nav-link">
          Trocas e Devoluções
        </Link>
      </nav>
    </main>
  );
}
