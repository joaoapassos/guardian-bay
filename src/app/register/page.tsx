import type { Metadata } from "next";
import { CredentialForm } from "@/features/auth/components/credential-form";

export const metadata: Metadata = { title: "Criar conta | Guardian Bay" };
export default function RegisterPage() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-6 py-16">
      <h1 className="mb-8 text-3xl font-semibold">Criar conta</h1>
      <CredentialForm mode="register" />
    </main>
  );
}
