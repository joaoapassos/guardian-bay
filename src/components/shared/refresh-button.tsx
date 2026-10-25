"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
export function RefreshButton({
  label = "Tentar novamente",
}: {
  label?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button disabled={pending} onClick={() => start(() => router.refresh())}>
      {pending ? "Atualizando…" : label}
    </Button>
  );
}
