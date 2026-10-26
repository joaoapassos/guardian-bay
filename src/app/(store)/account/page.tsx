import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";
import { readAccount } from "@/features/auth/server/read-account";
import { ProfileForm } from "@/features/buyers/components/profile-form";
import { readBuyerProfile } from "@/features/buyers/server/buyer-profile";
import { AccountShell } from "../_components/account-shell";

export const metadata: Metadata = { title: "Sua conta | Guardian Bay" };

export default async function AccountPage() {
  const account = await readAccount();

  if (!account) redirect("/login?returnTo=%2Faccount");

  const profile = await readBuyerProfile();
  if (!profile) redirect("/login?returnTo=%2Faccount");

  return (
    <AccountShell
      active="profile"
      title="Meu perfil"
      description="Seus dados pessoais e de acesso, com controle sobre o que você deseja salvar."
    >
      <section
        className="rounded-panel border border-line bg-surface p-5 sm:p-7"
        aria-labelledby="access-title"
      >
        <h2
          id="access-title"
          className="mb-5 font-editorial text-2xl text-coast"
        >
          Dados de acesso
        </h2>

        <dl>
          <dt className="font-medium">E-mail</dt>

          <dd className="mt-2 break-all">{account.email}</dd>
        </dl>

        <ProfileForm name={profile.name} cpfMask={profile.cpfMask} />
        <h3 className="mt-8 text-lg font-semibold">Alterar senha</h3>

        <ChangePasswordForm />
      </section>
      <section
        aria-labelledby="cards-title"
        className="rounded-panel border border-line bg-surface p-5 sm:p-7"
      >
        <h2
          id="cards-title"
          tabIndex={-1}
          className="font-editorial text-2xl text-coast"
        >
          Métodos de pagamento
        </h2>
        <p className="my-4 text-sm text-muted">
          Gerencie a identificação dos cartões salvos para a simulação. Nenhum
          pagamento real é realizado.
        </p>
        <Link className="auth-link" href="/account/payment-methods">
          Gerenciar métodos de pagamento
        </Link>
      </section>
    </AccountShell>
  );
}
