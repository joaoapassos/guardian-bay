import Link from "next/link";
import type { ReactNode } from "react";

export function AccountShell({
  active,
  title,
  description,
  children,
}: {
  active: "profile" | "orders" | "addresses";
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-7xl flex-1 px-5 py-10 font-auth text-ink sm:px-8 lg:py-16"
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
        Minha conta
      </p>
      <div className="grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-12">
        <nav
          aria-label="Navegação da conta"
          className="flex flex-wrap gap-2 border-b border-line pb-4 lg:flex-col lg:self-start lg:border-b-0 lg:border-r lg:pr-6"
        >
          {(
            [
              { href: "/account", label: "Meu perfil", key: "profile" },
              { href: "/orders", label: "Meus pedidos", key: "orders" },
              {
                href: "/account/addresses",
                label: "Endereços",
                key: "addresses",
              },
            ] as const
          ).map((item) => (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active === item.key ? "page" : undefined}
              className={`rounded-control px-4 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coast ${active === item.key ? "bg-coast text-paper" : "text-coast hover:bg-surface"}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="min-w-0 space-y-8">
          <header>
            <h1 className="break-words font-editorial text-4xl leading-tight text-coast sm:text-5xl">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl leading-relaxed text-muted">
              {description}
            </p>
          </header>
          {children}
        </div>
      </div>
    </main>
  );
}
