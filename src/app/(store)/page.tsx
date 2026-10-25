import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { HomeProducts } from "./_components/home-products";
export default function Home() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="store-page space-y-14! lg:space-y-20!"
    >
      <section className="grid items-center gap-8 py-4 md:grid-cols-2 md:gap-12">
        <div className="space-y-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">
            Preparo · Conforto · Confiança
          </p>
          <h1 className="font-editorial text-5xl leading-[1.08] text-coast sm:text-6xl">
            Preparado
            <br />
            para tudo.
          </h1>
          <p className="max-w-md text-lg leading-relaxed text-muted">
            Mais tranquilidade para o dia a dia. Equipamentos e utilidades para
            cuidar do que importa.
          </p>
          <Link href="/products" className="admin-action">
            Ver produtos{" "}
            <span aria-hidden="true" className="ml-3">
              ↗
            </span>
          </Link>
        </div>
        <Image
          src="/images/home/prepared.webp"
          alt=""
          width={1536}
          height={1024}
          preload
          sizes="(max-width:768px) 100vw, 50vw"
          className="w-full rounded-panel"
        />
      </section>
      <Suspense
        fallback={
          <section aria-busy="true" className="store-panel">
            <output>Carregando produtos…</output>
          </section>
        }
      >
        <HomeProducts />
      </Suspense>
    </main>
  );
}
