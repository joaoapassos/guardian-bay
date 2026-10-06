import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { getAuthenticatedIdentity } from "@/features/auth/server/session-cookie";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Guardian Bay",
  description: "Sua conta no Guardian Bay",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const identity = await getAuthenticatedIdentity();
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-zinc-300 px-6 py-4">
          <nav
            aria-label="Navegação principal"
            className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4"
          >
            <Link href="/" className="text-xl font-semibold">
              Guardian Bay
            </Link>
            <div className="flex items-center gap-5">
              <Link href="/products">Produtos</Link>
              {identity ? (
                <>
                  <Link href="/cart">Carrinho</Link>
                  <Link href="/account">Conta</Link>
                  <LogoutButton />
                </>
              ) : (
                <>
                  <Link href="/login">Entrar</Link>
                  <Link href="/register">Criar conta</Link>
                </>
              )}
            </div>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
