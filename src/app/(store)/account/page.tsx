import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";
import { readAccount } from "@/features/auth/server/read-account";
import { TestCardForm } from "@/features/orders/components/test-card-form";
import { TestCardList } from "@/features/orders/components/test-card-list";
import { readTestCards } from "@/features/orders/server/test-cards";
import { AccountShell } from "../_components/account-shell";

export const metadata: Metadata = { title: "Sua conta | Guardian Bay" };

export default async function AccountPage() {
  const account = await readAccount();

  if (!account) redirect("/login");

  const cards = await readTestCards();

  return (
    <AccountShell
      active="profile"
      title="Meu perfil"
      description="Seus dados de acesso e cartões de simulação, em um só lugar."
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
          Cartões fictícios
        </h2>
        <p className="my-4 text-sm text-muted">
          Até três cartões de teste. Nenhum pagamento real é realizado.
        </p>
        <TestCardList cards={cards} />

        <TestCardForm cardCount={cards.length} />
      </section>
    </AccountShell>
  );
}
