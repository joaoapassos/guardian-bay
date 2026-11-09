import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto grid w-full max-w-7xl flex-1 bg-paper font-auth lg:grid-cols-2"
      >
        <section
          aria-labelledby="auth-title"
          className="flex items-center px-5 py-6 sm:px-10 sm:py-8 lg:px-16"
        >
          <div className="mx-auto w-full max-w-[480px]">
            <p className="mb-3 text-sm font-semibold tracking-[0.16em] text-coast uppercase">
              Sua conta Guardian Bay
            </p>
            <h1
              id="auth-title"
              className="text-auth-title font-bold tracking-tight text-ink"
            >
              {title}
            </h1>
            <p className="mt-3 mb-6 max-w-prose text-base leading-relaxed text-muted">
              {description}
            </p>
            {children}
          </div>
        </section>
        <aside
          aria-label="Sobre o Guardian Bay"
          className="hidden flex-col justify-between border-l border-line bg-surface px-12 py-10 lg:flex xl:px-16"
        >
          <span className="text-sm font-semibold tracking-[0.18em] text-muted uppercase">
            Preparo · conforto · confiança
          </span>
          <div className="py-8">
            <span aria-hidden="true" className="mb-8 block h-px w-12 bg-sage" />
            <h2 className="font-editorial text-5xl leading-[1.12] font-semibold tracking-tight text-coast xl:text-6xl">
              Preparado
              <br />
              para tudo.
            </h2>
            <p className="mt-8 max-w-xs text-lg leading-relaxed text-muted">
              Mais tranquilidade para o dia a dia. Mais espaço para o que
              importa.
            </p>
          </div>
          <p className="max-w-sm border-t border-line pt-6 text-sm leading-relaxed text-muted">
            Conheça os produtos e encontre o que faz sentido para a sua rotina.
          </p>
        </aside>
      </main>
      <footer className="border-t border-line bg-paper px-5 py-4 font-auth text-sm text-muted sm:px-10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <p>
            Guardian Bay <span aria-hidden="true">·</span> Preparado para tudo.
          </p>
          <Link href="/" className="auth-link">
            Voltar à loja
          </Link>
        </div>
      </footer>
    </>
  );
}
