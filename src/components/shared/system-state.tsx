import Image from "next/image";
import Link from "next/link";

const states = {
  "not-found": {
    code: "404",
    title: "Este caminho não leva a uma página.",
    description:
      "Não encontramos o que você procurava. Que tal seguir por um caminho conhecido?",
  },
  "access-denied": {
    code: "403 · Acesso restrito",
    title: "Esta área precisa de permissão.",
    description:
      "Você não tem acesso a esta área. Sua navegação pode continuar pela loja.",
  },
  "unexpected-error": {
    code: "Algo saiu do esperado",
    title: "Vamos retomar o caminho.",
    description:
      "Não foi possível carregar esta página agora. Tente novamente ou volte para a loja.",
  },
} as const;

export function SystemState({
  kind,
  children,
}: {
  kind: keyof typeof states;
  children?: React.ReactNode;
}) {
  const state = states[kind];
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-8 px-5 py-10 font-auth md:grid-cols-2 md:gap-14 md:py-16"
    >
      <div className="space-y-6">
        <Link
          href="/"
          className="font-editorial text-xl font-extrabold text-coast"
        >
          GUARDIAN BAY
        </Link>
        <p className="text-sm font-semibold uppercase tracking-widest text-muted">
          {state.code}
        </p>
        <h1
          tabIndex={-1}
          className="font-editorial text-4xl leading-tight text-coast sm:text-5xl"
        >
          {state.title}
        </h1>
        <p className="max-w-md leading-relaxed text-muted">
          {state.description}
        </p>
        <div className="flex flex-wrap items-center gap-5">
          {children}
          <Link href="/" className="admin-action">
            Voltar à Home
          </Link>
          <Link href="/products" className="auth-link">
            Explorar produtos
          </Link>
        </div>
      </div>
      <Image
        src={`/images/system/${kind}.webp`}
        alt=""
        width={1536}
        height={1024}
        className="w-full rounded-panel"
      />
    </main>
  );
}
