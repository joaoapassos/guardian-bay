"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { saveTestCardAction } from "../actions/test-cards.action";
import { saveTestCardSchema } from "../schemas/test-card";
import { recognizeTestCard, testCardFixtures } from "../test-card-fixtures";

export function TestCardForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<{
    number: string;
    cvv: string;
    holder: string;
    expiry: string;
  }>();
  return (
    <section className="mt-6 rounded border p-4">
      <h3 className="text-lg font-semibold">Cadastrar cartão fictício</h3>
      <p>
        Simulação sem movimentação de dinheiro. Use exclusivamente uma das
        fixtures abaixo; nunca informe dados bancários reais.
      </p>
      <ul className="my-3 text-sm">
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
        className="grid gap-3"
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
            reset();
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
            if (result.success) router.refresh();
          } catch {
            setMessage("Não foi possível cadastrar o cartão fictício.");
          } finally {
            reset();
          }
        })}
      >
        <label>
          Número de teste
          <input
            className="block w-full rounded border p-2"
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
        </label>
        {errors.number && (
          <p role="alert">Use um dos números fictícios listados.</p>
        )}
        <label>
          Titular fictício
          <input
            className="block w-full rounded border p-2"
            maxLength={60}
            placeholder="PESSOA DE TESTE"
            aria-invalid={!!errors.holder}
            {...register("holder", {
              required: true,
              minLength: 2,
              maxLength: 60,
            })}
          />
        </label>
        {errors.holder && (
          <p role="alert">Informe um nome fictício de 2 a 60 caracteres.</p>
        )}
        <label>
          Validade (MM/AAAA)
          <input
            className="block w-full rounded border p-2"
            inputMode="numeric"
            maxLength={7}
            placeholder="12/2099"
            aria-invalid={!!errors.expiry}
            {...register("expiry", {
              required: true,
              pattern: /^(0[1-9]|1[0-2])\/20\d{2}$/,
            })}
          />
        </label>
        {errors.expiry && <p role="alert">Use MM/AAAA.</p>}
        <label>
          CVV de teste
          <input
            className="block w-full rounded border p-2"
            type="password"
            inputMode="numeric"
            maxLength={3}
            aria-invalid={!!errors.cvv}
            {...register("cvv", { required: true, pattern: /^\d{3}$/ })}
          />
        </label>
        {errors.cvv && <p role="alert">Informe os três dígitos da fixture.</p>}
        <p className="text-sm">
          Número, CVV e titular não são enviados nem salvos. Até três cartões;
          remova um existente para alterar sua validade.
        </p>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded border p-2 disabled:opacity-50"
        >
          {isSubmitting ? "Cadastrando…" : "Cadastrar cartão fictício"}
        </button>
        <output aria-live="polite">{message}</output>
      </form>
    </section>
  );
}
