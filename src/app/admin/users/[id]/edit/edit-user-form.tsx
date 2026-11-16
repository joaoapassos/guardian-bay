"use client";
import { useActionState, useState } from "react";
import { editAdminUserAction } from "@/features/auth/actions/edit-admin-user.action";
import { registrationPasswordHelp } from "@/features/auth/schemas/credential.schema";

export function EditUserForm({
  id,
  name,
  email,
}: {
  id: string;
  name: string | null;
  email: string;
}) {
  const [message, action, pending] = useActionState(editAdminUserAction, "");
  const [draftName, setDraftName] = useState(name ?? "");
  const [draftEmail, setDraftEmail] = useState(email);
  return (
    <form action={action} className="admin-panel space-y-5">
      <input type="hidden" name="userId" value={id} />
      <label className="block">
        Nome{" "}
        <input
          name="name"
          maxLength={100}
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          autoComplete="name"
        />
      </label>
      <label className="block">
        E-mail{" "}
        <input
          name="email"
          type="email"
          maxLength={320}
          value={draftEmail}
          onChange={(event) => setDraftEmail(event.target.value)}
          autoComplete="email"
          required
        />
      </label>
      <label className="block">
        Nova senha (opcional){" "}
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          aria-describedby="password-help"
        />
      </label>
      <p id="password-help" className="text-sm text-muted">
        {registrationPasswordHelp}
      </p>
      <p className="text-sm text-muted">
        Alterar o e-mail ou a senha encerra as sessões desta conta.
      </p>
      <button type="submit" className="admin-action" disabled={pending}>
        {pending ? "Salvando…" : "Salvar alterações"}
      </button>
      <output className="block" aria-live="polite">
        {message}
      </output>
    </form>
  );
}
