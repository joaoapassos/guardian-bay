"use client";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { savePaymentMethodAction } from "../actions/payment-methods.action";
import {
  type CardFormInput,
  cardExpirySchema,
  cardFormSchema,
  cardNumberSchema,
} from "../schemas/card";
import { CardNumberInput } from "./card-number-input";
import { CardValidityFields } from "./card-validity-fields";

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
  } = useForm<CardFormInput>();
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
        const parsed = cardFormSchema.safeParse(values);
        if (!parsed.success) {
          let focus = true;
          for (const issue of parsed.error.issues) {
            const name = issue.path[0];
            if (name === "number" || name === "expiry" || name === "cvv") {
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
        } finally {
          resetField("cvv", { defaultValue: "" });
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
        <CardNumberInput
          id={`${prefix}-number`}
          className="auth-input"
          autoComplete="off"
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
      <CardValidityFields
        id={prefix}
        expiry={register("expiry", {
          validate: (value) => {
            const result = cardExpirySchema.safeParse(value);
            return result.success || result.error.issues[0].message;
          },
        })}
        cvv={register("cvv")}
        expiryError={errors.expiry?.message}
        cvvError={errors.cvv?.message}
      />
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
