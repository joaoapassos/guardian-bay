import { redirect } from "next/navigation";
import { SystemState } from "@/components/shared/system-state";
export function AccessState({
  code,
}: {
  code: "UNAUTHENTICATED" | "FORBIDDEN";
}) {
  if (code === "UNAUTHENTICATED") redirect("/login");
  return <SystemState kind="access-denied" />;
}
