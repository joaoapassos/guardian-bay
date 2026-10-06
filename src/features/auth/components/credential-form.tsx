"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { loginAction } from "../actions/login.action";
import { registerAction } from "../actions/register.action";
import {
  authenticationPasswordSchema,
  type credentialSchema,
  emailSchema,
  passwordSchema,
} from "../schemas/credential.schema";

export function CredentialForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const feedback = useRef<HTMLOutputElement>(null);
  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof credentialSchema>>();
  useEffect(() => {
    if (message) feedback.current?.focus();
  }, [message]);
  const creating = mode === "register";

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async (input) => {
        setMessage("");
        try {
          if (creating) {
            const result = await registerAction(input);
            setMessage(
              result.success
                ? "Solicitação processada. Entre com suas credenciais; se já possui conta, sua senha permanece a mesma."
                : result.code === "RATE_LIMITED"
                  ? "Tente novamente mais tarde."
                  : "Confira o e-mail e a senha informados.",
            );
          } else {
            const result = await loginAction(input);
            if (result.success) {
              router.replace("/");
              router.refresh();
            } else setMessage(result.message);
          }
        } catch {
          setMessage(
            "Não foi possível concluir agora. Tente novamente mais tarde.",
          );
        } finally {
          resetField("password");
        }
      })}
      className="space-y-6"
      aria-busy={isSubmitting}
    >
      <div>
        <label htmlFor="email" className="block font-medium">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          maxLength={320}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          className="mt-2 w-full rounded border border-zinc-400 px-3 py-2"
          {...register("email", {
            validate: (value) =>
              emailSchema.safeParse(value).success ||
              "Informe um e-mail válido.",
          })}
        />
        {errors.email && (
          <p id="email-error" className="mt-2 text-red-700">
            {errors.email.message}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="password" className="block font-medium">
          Senha
        </label>
        <input
          id="password"
          type="password"
          autoComplete={creating ? "new-password" : "current-password"}
          maxLength={256}
          aria-invalid={!!errors.password}
          aria-describedby="password-help password-error"
          className="mt-2 w-full rounded border border-zinc-400 px-3 py-2"
          {...register("password", {
            validate: (value) =>
              (creating
                ? passwordSchema
                : authenticationPasswordSchema
              ).safeParse(value).success ||
              (creating
                ? "Use entre 15 e 128 caracteres."
                : "Informe uma senha de até 128 caracteres."),
          })}
        />
        <p id="password-help" className="mt-2 text-sm text-zinc-600">
          {creating
            ? "Use uma frase de 15 a 128 caracteres. Espaços são preservados."
            : "Use sua senha atual."}
        </p>
        <p id="password-error" className="mt-2 text-red-700">
          {errors.password?.message}
        </p>
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded bg-teal-800 px-4 py-3 font-medium text-white disabled:opacity-60"
      >
        {isSubmitting ? "Processando…" : creating ? "Criar conta" : "Entrar"}
      </button>
      {message && (
        <output ref={feedback} tabIndex={-1} className="block">
          {message}
        </output>
      )}
      <p className="text-sm">
        <Link href={creating ? "/login" : "/register"} className="underline">
          {creating ? "Já tem conta? Entrar" : "Criar uma conta"}
        </Link>
      </p>
    </form>
  );
}
