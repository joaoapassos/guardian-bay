"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  FormFeedback,
  type FormMessage,
} from "@/components/forms/form-feedback";
import { Button } from "@/components/ui/button";
import { loginAction } from "../actions/login.action";
import { CredentialFields, type CredentialInput } from "./credential-fields";

export function LoginForm({ returnTo = "/account" }: { returnTo?: string }) {
  const router = useRouter();
  const form = useForm<CredentialInput>();
  const [message, setMessage] = useState<FormMessage>(null);
  const submitting = useRef(false);
  const { isSubmitting } = form.formState;
  return (
    <form
      noValidate
      aria-label="Entrar na sua conta"
      aria-busy={isSubmitting}
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (submitting.current) return;
        submitting.current = true;
        try {
          await form.handleSubmit(
            async (input) => {
              setMessage(null);
              try {
                const result = await loginAction(input);
                if (result.success) {
                  router.replace(returnTo);
                  router.refresh();
                } else setMessage({ kind: "error", text: result.message });
              } catch {
                setMessage({
                  kind: "error",
                  text: "Não foi possível concluir agora. Tente novamente mais tarde.",
                });
              } finally {
                form.resetField("password");
              }
            },
            () => setMessage(null),
          )(event);
        } finally {
          submitting.current = false;
        }
      }}
    >
      <CredentialFields form={form} mode="login" />
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Entrando…" : "Entrar"}
        <ArrowRight size={18} aria-hidden="true" />
      </Button>
      <FormFeedback message={message} />
      <p className="text-center text-sm leading-relaxed text-muted">
        Ainda não tem uma conta?{" "}
        <Link
          href={
            returnTo === "/account"
              ? "/register"
              : `/register?returnTo=${encodeURIComponent(returnTo)}`
          }
          className="auth-link"
        >
          Criar conta
        </Link>
      </p>
    </form>
  );
}
