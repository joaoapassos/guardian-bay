import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono, IBM_Plex_Sans } from "next/font/google";
import { PageTransition } from "@/components/shared/page-transition";
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
        <div className="flex flex-1 flex-col">
          <PageTransition>{children}</PageTransition>
        </div>
      </body>
    </html>
  );
}
