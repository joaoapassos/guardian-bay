"use client";
import { useActionState, useState } from "react";
import { createAdminUserAction } from "@/features/auth/actions/create-admin-user.action";
import { registrationPasswordHelp } from "@/features/auth/schemas/credential.schema";

export function CreateUserForm() {
  const [message, action, pending] = useActionState(createAdminUserAction, "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  return (
    <form action={action} className="admin-panel space-y-5">
      <label className="block">
        Nome{" "}
        <input
          name="name"
          maxLength={100}
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <label className="block">
        E-mail{" "}
        <input
          name="email"
          type="email"
          maxLength={320}
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>
      <label className="block">
        Senha inicial{" "}
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          aria-describedby="password-help"
        />
      </label>
      <p id="password-help" className="text-sm text-muted">
        {registrationPasswordHelp}
      </p>
      <p className="text-sm text-muted">
        A conta será criada como usuário comum. O cargo pode ser alterado nas
        ações do usuário.
      </p>
      <button type="submit" className="admin-action" disabled={pending}>
        {pending ? "Cadastrando…" : "Cadastrar usuário"}
      </button>
      <output className="block" aria-live="polite">
        {message}
      </output>
    </form>
  );
}
