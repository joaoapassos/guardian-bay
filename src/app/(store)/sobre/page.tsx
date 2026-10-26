import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { RouteReady } from "@/components/shared/route-ready";

export const metadata: Metadata = {
  title: "Sobre | Guardian Bay",
  description:
    "Conheça o Guardian Bay: preparação, conforto e cuidado com o dia a dia em um projeto acadêmico de e-commerce.",
};

export default function AboutPage() {
  return (
    <main id="main-content" tabIndex={-1} className="store-page">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link className="auth-link" href="/">
          Home
        </Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">Sobre</span>
      </nav>
      <section
        aria-labelledby="about-title"
        className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12"
      >
        <div className="space-y-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">
            Sobre o Guardian Bay
          </p>
          <h1 id="about-title" className="store-title">
            Preparado para tudo.
          </h1>
          <p className="text-lg leading-relaxed text-muted">
            Mais tranquilidade para o dia a dia. Mais espaço para o que importa.
          </p>
          <p className="leading-relaxed">
            O Guardian Bay nasce como um projeto acadêmico de e-commerce, com
            uma ideia simples: tornar a preparação cotidiana mais clara, prática
            e acolhedora.
          </p>
          <Link
            href="/products"
            className="inline-flex min-h-11 items-center justify-center rounded-control border border-ink bg-primary px-5 py-3 font-semibold text-on-primary transition-colors duration-300 motion-reduce:transition-none hover:bg-ink hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-coast"
          >
            Explorar produtos
          </Link>
        </div>
        <Image
          src="/images/home/prepared.webp"
          alt=""
          width={1200}
          height={800}
          className="h-auto w-full rounded-panel"
          sizes="(min-width: 1024px) 50vw, 100vw"
        />
      </section>
      <section
        aria-labelledby="purpose-title"
        className="max-w-3xl space-y-5 py-6"
      >
        <h2 id="purpose-title" className="font-editorial text-3xl text-coast">
          Preparo com calma e propósito
        </h2>
        <p className="leading-relaxed">
          A atmosfera de uma comunidade costeira inspira nossa linguagem: cores
          suaves, materiais simples e uma sensação de proximidade. É uma
          referência visual, sem representar uma loja física ou uma história
          empresarial real.
        </p>
        <p className="leading-relaxed">
          Segurança cotidiana, conforto e confiabilidade orientam a experiência.
          Preparar-se significa cuidar do que importa, com informação clara e
          escolhas conscientes.
        </p>
      </section>
      <section aria-labelledby="values-title">
        <h2
          id="values-title"
          className="mb-6 font-editorial text-3xl text-coast"
        >
          O que orienta a experiência
        </h2>
        <dl className="grid gap-5 md:grid-cols-3">
          <div className="store-panel">
            <dt className="text-lg font-semibold text-coast">Clareza</dt>
            <dd className="mt-3 leading-relaxed">
              Informações acessíveis para entender cada etapa e seus limites.
            </dd>
          </div>
          <div className="store-panel">
            <dt className="text-lg font-semibold text-coast">Cuidado</dt>
            <dd className="mt-3 leading-relaxed">
              Uma navegação acolhedora, com espaço para ler e decidir.
            </dd>
          </div>
          <div className="store-panel">
            <dt className="text-lg font-semibold text-coast">Confiança</dt>
            <dd className="mt-3 leading-relaxed">
              Comunicação honesta sobre o que o projeto oferece e o que ainda
              está em construção.
            </dd>
          </div>
        </dl>
      </section>
      <aside className="store-panel space-y-3">
        <h2 className="font-editorial text-2xl text-coast">
          Uma experiência de aprendizado
        </h2>
        <p className="leading-relaxed">
          Os pagamentos são exclusivamente simulados. Nenhum dinheiro é
          movimentado, e o projeto não oferece uma operação real de entrega ou
          reembolso.
        </p>
        <Link href="/ajuda" className="auth-link inline-block">
          Conhecer os fluxos na Central de Ajuda
        </Link>
      </aside>
      <RouteReady />
    </main>
  );
}
