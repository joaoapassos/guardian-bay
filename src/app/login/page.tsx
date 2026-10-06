import type { Metadata } from "next";
import { CredentialForm } from "@/features/auth/components/credential-form";

export const metadata: Metadata = { title: "Entrar | Guardian Bay" };
export default function LoginPage() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-6 py-16">
      <h1 className="mb-8 text-3xl font-semibold">Entrar</h1>
      <CredentialForm mode="login" />
    </main>
  );
}
