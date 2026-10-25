import type { Metadata } from "next";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";
import { safeReturn } from "@/features/auth/safe-return";

export const metadata: Metadata = { title: "Entrar | Guardian Bay" };
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <AuthShell
      title="Entrar"
      description="Bom ter você por aqui. Acesse sua conta para acompanhar seus pedidos."
    >
      <LoginForm returnTo={safeReturn((await searchParams).returnTo)} />
      <section
        aria-labelledby="access-help"
        className="mt-6 border-t border-line pt-4"
      >
        <h2 id="access-help" className="text-sm font-semibold text-ink">
          Precisa de ajuda para entrar?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Se perdeu o acesso, entre em contato com um administrador. A
          recuperação automática de senha ainda não está disponível.
        </p>
      </section>
    </AuthShell>
  );
}
