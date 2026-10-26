"use client";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { savePaymentMethodAction } from "../actions/payment-methods.action";
import {
  type CardInput,
  cardInputSchema,
  cardNumberSchema,
} from "../schemas/card";

export function PaymentMethodForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const prefix = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const [message, setMessage] = useState("");
  const {
    register,
    handleSubmit,
    setError,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<CardInput>();
  useEffect(() => {
    heading.current?.focus();
  }, []);
  return (
    <form
      aria-label="Adicionar cartão de simulação"
      aria-busy={isSubmitting}
      noValidate
      className="space-y-5 rounded-panel border border-line bg-surface p-5 sm:p-7"
      onSubmit={handleSubmit(async (values) => {
        setMessage("");
        const parsed = cardInputSchema.safeParse(values);
        if (!parsed.success) {
          let focus = true;
          for (const issue of parsed.error.issues) {
            const name = issue.path[0];
            if (
              name === "number" ||
              name === "expiryMonth" ||
              name === "expiryYear"
            ) {
              setError(
                name,
                { message: issue.message },
                { shouldFocus: focus },
              );
              focus = false;
            }
          }
          return;
        }
        try {
          const result = await savePaymentMethodAction(parsed.data);
          if (result.success) {
            resetField("number");
            onClose();
            router.refresh();
          } else if (result.code === "UNAUTHENTICATED")
            router.replace("/login");
          else
            setMessage(
              result.code === "LIMIT_REACHED"
                ? "Você pode salvar até três cartões. Remova um para adicionar outro."
                : result.code === "RATE_LIMITED"
                  ? "Muitas tentativas. Aguarde antes de tentar novamente."
                  : "Confira o número e a validade do cartão.",
            );
        } catch {
          resetField("number");
          setMessage(
            "Não foi possível confirmar o cadastro. Atualize a página antes de tentar novamente.",
          );
        }
      })}
    >
      <h2
        ref={heading}
        tabIndex={-1}
        className="font-editorial text-2xl text-coast"
      >
        Novo cartão
      </h2>
      <p className="text-sm text-muted">
        Todos os campos são obrigatórios. Use apenas um número de teste. O
        pagamento é sempre simulado, sem cobrança real.
      </p>
      <FormField
        id={`${prefix}-number`}
        label="Número do cartão"
        help="Visa, Mastercard ou American Express. Espaços e hífens são aceitos."
        error={errors.number?.message}
      >
        <input
          id={`${prefix}-number`}
          className="auth-input"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          maxLength={32}
          required
          aria-invalid={!!errors.number}
          aria-describedby={`${prefix}-number-help ${prefix}-number-error`}
          {...register("number", {
            validate: (value) =>
              cardNumberSchema.safeParse(value).success ||
              "Informe um número válido Visa, Mastercard ou American Express.",
          })}
        />
      </FormField>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id={`${prefix}-month`}
          label="Mês de validade"
          error={errors.expiryMonth?.message}
        >
          <select
            id={`${prefix}-month`}
            className="auth-input"
            required
            aria-invalid={!!errors.expiryMonth}
            aria-describedby={`${prefix}-month-error`}
            {...register("expiryMonth", {
              valueAsNumber: true,
              validate: (value) =>
                (Number.isInteger(value) && value >= 1 && value <= 12) ||
                "Selecione o mês de validade.",
            })}
          >
            <option value="">Selecione</option>
            {Array.from({ length: 12 }, (_, index) => index + 1).map(
              (month) => (
                <option key={month} value={month}>
                  {String(month).padStart(2, "0")}
                </option>
              ),
            )}
          </select>
        </FormField>
        <FormField
          id={`${prefix}-year`}
          label="Ano de validade"
          error={errors.expiryYear?.message}
        >
          <input
            id={`${prefix}-year`}
            className="auth-input"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            required
            aria-invalid={!!errors.expiryYear}
            aria-describedby={`${prefix}-year-error`}
            {...register("expiryYear", {
              valueAsNumber: true,
              validate: (value) =>
                (Number.isInteger(value) && value >= 2000 && value <= 2099) ||
                "Informe o ano com quatro dígitos.",
            })}
          />
        </FormField>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando…" : "Salvar cartão"}
        </Button>
        <Button
          className="bg-paper text-coast"
          disabled={isSubmitting}
          onClick={onClose}
        >
          Cancelar
        </Button>
      </div>
      {message && (
        <p role="alert" className="text-danger">
          {message}
        </p>
      )}
    </form>
  );
}
