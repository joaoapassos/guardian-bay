import type { Metadata } from "next";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { RegisterForm } from "@/features/auth/components/register-form";
import { safeReturn } from "@/features/auth/safe-return";

export const metadata: Metadata = { title: "Criar conta | Guardian Bay" };
export default async function RegisterPage({
  searchParams,
}: PageProps<"/register">) {
  return (
    <AuthShell
      title="Criar conta"
      description="Comece por aqui. Organize seu carrinho e acompanhe seus pedidos em um só lugar."
    >
      <RegisterForm returnTo={safeReturn((await searchParams).returnTo)} />
      <p className="mt-6 border-t border-line pt-4 text-sm leading-relaxed text-muted">
        Só o necessário: seu e-mail e uma senha. Ao concluir o cadastro, você já
        entra na sua conta.
      </p>
    </AuthShell>
  );
}
