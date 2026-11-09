"use client";
import { useActionState } from "react";
import { manageUserAction } from "@/features/auth/actions/manage-user.action";

export function ManageUserForm({
  id,
  operation,
}: {
  id: string;
  operation: "suspend" | "reactivate" | "revoke";
}) {
  const [message, action, pending] = useActionState(manageUserAction, "");
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="userId" value={id} />
      <input type="hidden" name="operation" value={operation} />
      <button className="admin-action" type="submit" disabled={pending}>
        {pending ? "Processando…" : "Confirmar"}
      </button>
      <output aria-live="polite" className="block">
        {message}
      </output>
    </form>
  );
}
