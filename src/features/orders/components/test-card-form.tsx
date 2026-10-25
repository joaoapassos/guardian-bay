"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { saveTestCardAction } from "../actions/test-cards.action";
import { saveTestCardSchema } from "../schemas/test-card";
import { recognizeTestCard, testCardFixtures } from "../test-card-fixtures";

export function TestCardForm({ cardCount = 0 }: { cardCount?: number }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<{
    number: string;
    cvv: string;
    holder: string;
    expiry: string;
  }>();
  return (
    <section className="mt-6 border-t border-line pt-6">
      <h3 className="text-lg font-semibold">Cadastrar cartão fictício</h3>
      <p>
        Simulação sem movimentação de dinheiro. Use exclusivamente uma das
        fixtures abaixo; nunca informe dados bancários reais.
      </p>
      <ul className="my-4 grid gap-2 rounded-control border border-line bg-paper p-4 font-mono text-sm">
        {testCardFixtures.map((f) => (
          <li key={f.id}>
            {f.number.replace(/(.{4})(?=.)/g, "$1 ")} — CVV de teste: {f.cvv}
          </li>
        ))}
      </ul>
      <form
        aria-label="Cadastrar cartão fictício"
        autoComplete="off"
        noValidate
        aria-busy={isSubmitting}
        className="grid gap-5 sm:grid-cols-2"
        onSubmit={handleSubmit(async (input) => {
          setMessage("");
          const fixture = recognizeTestCard(input.number, input.cvv);
          const [month, year] = input.expiry.split("/").map(Number);
          const parsed = saveTestCardSchema.safeParse({
            fixtureId: fixture?.id,
            expiryMonth: month,
            expiryYear: year,
          });
          if (!parsed.success) {
            setMessage(
              "Use uma fixture autorizada, seu CVV de teste e validade MM/AAAA.",
            );
            resetField("cvv");
            return;
          }
          try {
            const result = await saveTestCardAction(parsed.data);
            setMessage(
              result.success
                ? "Cartão fictício cadastrado. Se já existia, foi preservado."
                : result.code === "RATE_LIMITED"
                  ? "Muitas operações. Aguarde um minuto."
                  : "Não foi possível cadastrar. Confira a validade e sua sessão.",
            );
            if (result.success) {
              reset();
              router.refresh();
            }
          } catch {
            setMessage("Não foi possível cadastrar o cartão fictício.");
          } finally {
            resetField("cvv");
          }
        })}
      >
        <FormField
          id="test-card-number"
          label="Número de teste"
          error={
            errors.number ? "Use um dos números fictícios listados." : undefined
          }
        >
          <input
            required
            id="test-card-number"
            aria-describedby="test-card-number-error"
            className="auth-input"
            inputMode="numeric"
            maxLength={19}
            placeholder="0000 0000 0000 0001"
            aria-invalid={!!errors.number}
            {...register("number", {
              required: true,
              validate: (v) =>
                testCardFixtures.some(
                  (f) => f.number === v.replaceAll(" ", ""),
                ),
            })}
          />
        </FormField>
        <FormField
          id="test-card-holder"
          label="Titular fictício"
          error={
            errors.holder
              ? "Informe um nome fictício de 2 a 60 caracteres."
              : undefined
          }
        >
          <input
            required
            id="test-card-holder"
            aria-describedby="test-card-holder-error"
            className="auth-input"
            maxLength={60}
            placeholder="PESSOA DE TESTE"
            aria-invalid={!!errors.holder}
            {...register("holder", {
              required: true,
              minLength: 2,
              maxLength: 60,
            })}
          />
        </FormField>
        <FormField
          id="test-card-expiry"
          label="Validade (MM/AAAA)"
          error={errors.expiry ? "Use MM/AAAA." : undefined}
        >
          <input
            required
            id="test-card-expiry"
            aria-describedby="test-card-expiry-error"
            className="auth-input"
            inputMode="numeric"
            maxLength={7}
            placeholder="12/2099"
            aria-invalid={!!errors.expiry}
            {...register("expiry", {
              required: true,
              pattern: /^(0[1-9]|1[0-2])\/20\d{2}$/,
            })}
          />
        </FormField>
        <FormField
          id="test-card-cvv"
          label="CVV de teste"
          error={errors.cvv ? "Informe os três dígitos da fixture." : undefined}
        >
          <input
            required
            id="test-card-cvv"
            aria-describedby="test-card-cvv-error"
            className="auth-input"
            type="password"
            inputMode="numeric"
            maxLength={3}
            aria-invalid={!!errors.cvv}
            {...register("cvv", { required: true, pattern: /^\d{3}$/ })}
          />
        </FormField>
        <p className="text-sm text-muted sm:col-span-2">
          Número, CVV e titular não são enviados nem salvos. Até três cartões;
          remova um existente para alterar sua validade.
        </p>
        <Button
          type="submit"
          disabled={isSubmitting || cardCount >= 3}
          className="justify-self-start"
        >
          {isSubmitting ? "Cadastrando…" : "Cadastrar cartão fictício"}
        </Button>
        {cardCount >= 3 && (
          <p className="text-sm font-semibold sm:col-span-2">
            Você já possui três cartões fictícios. Remova um para cadastrar
            outro.
          </p>
        )}
        <output aria-live="polite" className="sm:col-span-2">
          {message}
        </output>
      </form>
    </section>
  );
}
