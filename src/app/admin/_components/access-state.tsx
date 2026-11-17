import { forbidden, redirect } from "next/navigation";
export function AccessState({
  code,
}: {
  code: "UNAUTHENTICATED" | "FORBIDDEN";
}) {
  if (code === "UNAUTHENTICATED") redirect("/login");
  return forbidden();
}
