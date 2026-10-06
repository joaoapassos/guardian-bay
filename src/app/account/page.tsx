import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";
import { readAccount } from "@/features/auth/server/read-account";

export const metadata: Metadata = { title: "Sua conta | Guardian Bay" };
export default async function AccountPage() {
  const account = await readAccount();
  if (!account) redirect("/login");
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-16">
      <h1 className="mb-8 text-3xl font-semibold">Sua conta</h1>
      <dl>
        <dt className="font-medium">E-mail</dt>
        <dd className="mt-2 break-all">{account.email}</dd>
      </dl>
      <h2 className="mt-10 text-xl font-semibold">Alterar senha</h2>
      <ChangePasswordForm />
    </main>
  );
}
