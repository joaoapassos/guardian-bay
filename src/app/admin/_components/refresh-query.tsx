"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
export function RefreshQuery() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div>
      <Button disabled={pending} onClick={() => start(() => router.refresh())}>
        {pending ? "Atualizando…" : "Atualizar consulta"}
      </Button>
      <output className="sr-only">
        {pending ? "Atualizando consulta" : "Consulta pronta"}
      </output>
    </div>
  );
}
