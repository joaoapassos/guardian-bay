"use client";
import { useState } from "react";
export function CopyPaymentCode({ code }: { code: string }) {
  const [message, setMessage] = useState("");
  return (
    <div>
      <p className="break-all rounded border p-3 font-mono">{code}</p>
      <button
        type="button"
        className="mt-2 underline"
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
      </button>
      <output className="block" aria-live="polite">
        {message}
      </output>
    </div>
  );
}
