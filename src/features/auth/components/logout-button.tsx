"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { logoutAction } from "../actions/logout.action";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setMessage("");
          try {
            const result = await logoutAction();
            if (result.success) {
              router.replace("/");
              router.refresh();
            } else setMessage("Não foi possível sair agora.");
          } catch {
            setMessage("Não foi possível sair agora. Tente novamente.");
          } finally {
            setPending(false);
          }
        }}
        className="rounded border px-3 py-1 disabled:opacity-60"
      >
        {pending ? "Saindo…" : "Sair"}
      </button>
      {message && <output className="block text-sm">{message}</output>}
    </div>
  );
}
