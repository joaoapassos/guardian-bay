"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
export function CopyPaymentCode({ code }: { code: string }) {
  const [message, setMessage] = useState("");
  return (
    <div>
      <p className="break-all rounded-control border border-line bg-paper p-4 font-mono text-sm">
        {code}
      </p>
      <Button
        type="button"
        className="mt-3"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code);
            setMessage("Código fictício copiado.");
          } catch {
            setMessage("Selecione e copie o texto acima.");
          }
        }}
      >
        Copiar código fictício
      </Button>
      <output className="block" aria-live="polite">
        {message}
      </output>
    </div>
  );
}
