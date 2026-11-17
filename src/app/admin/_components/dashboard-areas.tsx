"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { type AdminCounts, startCountsPolling } from "./counts-polling";

const areas = [
  {
    href: "/admin/catalog",
    key: "products",
    title: "Produtos",
    description: "Cuide do catálogo, da publicação e do estoque.",
  },
  {
    href: "/admin/categories",
    key: "categories",
    title: "Categorias",
    description: "Organize os produtos com nomes claros e úteis.",
  },
  {
    href: "/admin/orders",
    key: "orders",
    title: "Pedidos",
    description: "Acompanhe os pedidos e seus registros de pagamento simulado.",
  },
  {
    href: "/admin/users",
    key: "users",
    title: "Usuários",
    description: "Consulte e gerencie os usuários cadastrados.",
  },
] as const;

export function DashboardAreas({
  initialCounts,
}: {
  initialCounts: AdminCounts;
}) {
  const [counts, setCounts] = useState(initialCounts);
  const router = useRouter();
  useEffect(
    () =>
      startCountsPolling(initialCounts, {
        fetcher: fetch,
        onChange: setCounts,
        onDenied: () => router.refresh(),
      }),
    [initialCounts, router],
  );
  return (
    <section
      className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4"
      aria-label="Áreas de trabalho"
    >
      {areas.map((area) => (
        <Link
          key={area.href}
          href={area.href}
          className="admin-panel group block hover:border-coast focus-visible:outline-2 focus-visible:outline-coast"
        >
          <span className="font-editorial text-4xl text-sage">
            {counts[area.key].toLocaleString("pt-BR")}
          </span>
          <h2 className="mt-8 text-xl font-semibold text-coast">
            {area.title} <span aria-hidden="true">↗</span>
          </h2>
          <p className="text-sm text-muted">Total cadastrado</p>
          <p className="mt-3 leading-relaxed text-muted">{area.description}</p>
        </Link>
      ))}
    </section>
  );
}
