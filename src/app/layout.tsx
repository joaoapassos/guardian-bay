import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono, IBM_Plex_Sans } from "next/font/google";
import Link from "next/link";
import { PageTransition } from "@/components/shared/page-transition";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { SessionActivity } from "@/features/auth/components/session-activity";
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

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});
const plexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
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
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${plexSans.variable} h-full antialiased`}
    >
      <body className="flex min-h-dvh flex-col">
        {identity && <SessionActivity />}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-control focus:bg-coast focus:px-5 focus:py-3 focus:text-paper"
        >
          Ir para o conteúdo
        </a>
        <header className="border-b border-line bg-paper px-5 py-4 text-ink sm:px-10">
          <nav
            aria-label="Navegação principal"
            className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4"
          >
            <Link
              href="/"
              className="rounded-sm font-editorial text-xl font-extrabold tracking-tight text-coast focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-coast sm:text-2xl"
            >
              GUARDIAN BAY
            </Link>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 font-auth text-sm [&>a]:inline-flex [&>a]:min-h-11 [&>a]:items-center [&>a]:rounded-sm [&>a]:text-coast [&>a]:underline-offset-4 [&>a:hover]:underline [&>a:focus-visible]:outline-2 [&>a:focus-visible]:outline-offset-4 [&>a:focus-visible]:outline-coast">
              <Link href="/products">Produtos</Link>
              {identity ? (
                <>
                  <Link href="/cart">Carrinho</Link>
                  <Link href="/orders">Pedidos</Link>
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
        <div id="main-content" tabIndex={-1} className="flex flex-1 flex-col">
          <PageTransition>{children}</PageTransition>
        </div>
      </body>
    </html>
  );
}
