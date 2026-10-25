"use client";
import "./globals.css";
import { SystemState } from "@/components/shared/system-state";
import { Button } from "@/components/ui/button";
export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="pt-BR">
      <body>
        <SystemState kind="unexpected-error">
          <Button onClick={retry}>Tentar novamente</Button>
        </SystemState>
      </body>
    </html>
  );
}
