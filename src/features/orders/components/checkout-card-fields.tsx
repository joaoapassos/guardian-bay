"use client";
import Link from "next/link";
import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { FormField } from "@/components/forms/form-field";
import {
  cardNumberSchema,
  isCardExpired,
  type PaymentMethodDto,
} from "@/features/payments/schemas/card";
import type { CheckoutFormValues } from "./checkout-form-values";

export function CheckoutCardFields({
  cards,
  paymentMethodId,
  onCardChange,
  register,
  errors,
}: {
  cards: PaymentMethodDto[];
  paymentMethodId: string;
  onCardChange: (id: string) => void;
  register: UseFormRegister<CheckoutFormValues>;
  errors: FieldErrors<CheckoutFormValues>;
}) {
  return (
    <div className="space-y-5">
      <FormField id="checkout-card" label="Cartão para a simulação">
        <select
          id="checkout-card"
          className="auth-input"
          value={paymentMethodId}
          onChange={(event) => onCardChange(event.target.value)}
        >
          <option value="">Informar um cartão para este pedido</option>
          {cards.map((card) => (
            <option
              key={card.id}
              value={card.id}
              disabled={isCardExpired(card.expiryMonth, card.expiryYear)}
            >
              {card.brand} · final {card.last4} ·{" "}
              {String(card.expiryMonth).padStart(2, "0")}/{card.expiryYear}
              {isCardExpired(card.expiryMonth, card.expiryYear)
                ? " · expirado"
                : ""}
            </option>
          ))}
        </select>
      </FormField>
      {!paymentMethodId && (
        <>
          <p className="text-sm text-muted">
            Use somente um número de teste Visa, Mastercard ou American Express.
            Todos os campos são obrigatórios.
          </p>
          <FormField
            id="checkout-card-number"
            label="Número do cartão"
            error={errors.card?.number?.message}
          >
            <input
              id="checkout-card-number"
              className="auth-input"
              inputMode="numeric"
              autoComplete="off"
              maxLength={32}
              required
              aria-invalid={!!errors.card?.number}
              aria-describedby="checkout-card-number-error"
              {...register("card.number", {
                validate: (value) =>
                  cardNumberSchema.safeParse(value).success ||
                  "Informe um número válido Visa, Mastercard ou American Express.",
              })}
            />
          </FormField>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              id="checkout-card-month"
              label="Mês de validade"
              error={errors.card?.expiryMonth?.message}
            >
              <select
                id="checkout-card-month"
                className="auth-input"
                required
                aria-invalid={!!errors.card?.expiryMonth}
                aria-describedby="checkout-card-month-error"
                {...register("card.expiryMonth", {
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
              id="checkout-card-year"
              label="Ano de validade"
              error={errors.card?.expiryYear?.message}
            >
              <input
                id="checkout-card-year"
                className="auth-input"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                required
                aria-invalid={!!errors.card?.expiryYear}
                aria-describedby="checkout-card-year-error"
                {...register("card.expiryYear", {
                  valueAsNumber: true,
                  validate: (value) =>
                    (Number.isInteger(value) &&
                      value >= 2000 &&
                      value <= 2099) ||
                    "Informe o ano com quatro dígitos.",
                })}
              />
            </FormField>
          </div>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1 size-4 accent-coast"
              {...register("saveCard")}
            />
            <span>
              Salvar bandeira, final e validade para próximas simulações.
            </span>
          </label>
        </>
      )}
      <Link href="/account/payment-methods" className="auth-link inline-block">
        Gerenciar formas de pagamento
      </Link>
    </div>
  );
}
