"use client";
import { SystemState } from "@/components/shared/system-state";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <SystemState kind="unexpected-error">
      <Button onClick={retry}>Tentar novamente</Button>
    </SystemState>
  );
}
