"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import type { AddressDto } from "@/features/addresses/schemas/address";
import { loginHref } from "@/features/auth/safe-return";
import {
  cardInputSchema,
  isCardExpired,
  type PaymentMethodDto,
} from "@/features/payments/schemas/card";
import { checkoutAction } from "../actions/checkout.action";
import { checkoutSchema } from "../schemas/checkout";
import { CheckoutAddressFields } from "./checkout-address-fields";
import { CheckoutBuyerFields } from "./checkout-buyer-fields";
import { CheckoutCardFields } from "./checkout-card-fields";
import type {
  CheckoutBuyerProfile,
  CheckoutFormValues,
} from "./checkout-form-values";

const failures: Record<string, string> = {
  RATE_LIMITED: "Muitas confirmações. Aguarde e tente novamente.",
  INVALID_CARD:
    "Cartão indisponível ou vencido. Confira a validade ou escolha outro.",
  INVALID_ADDRESS: "Endereço indisponível. Informe outro ou atualize a página.",
  INVALID_BUYER: "Confira o nome e o CPF do comprador.",
  EMPTY_CART: "O carrinho está vazio. Volte ao catálogo.",
  OUT_OF_STOCK: "Estoque insuficiente. Revise o carrinho.",
  UNAVAILABLE: "Um produto está indisponível. Corrija o carrinho.",
  LIMIT_REACHED:
    "Limite de dados salvos atingido. Desmarque a opção de salvar ou gerencie sua conta.",
  CONFLICT: "A disponibilidade mudou. Revise o carrinho antes de confirmar.",
};

export function CheckoutConfirmation({
  checkoutKey,
  cards,
  addresses,
  profile,
}: {
  checkoutKey: string;
  addresses: AddressDto[];
  cards: PaymentMethodDto[];
  profile: CheckoutBuyerProfile;
}) {
  const [key] = useState(checkoutKey);
  const [message, setMessage] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const router = useRouter();
  const inFlight = useRef(false);
  const [method, setMethod] = useState<"CARD" | "PIX" | "BOLETO">("CARD");
  const [paymentMethodId, setPaymentMethodId] = useState(
    cards.find((card) => !isCardExpired(card.expiryMonth, card.expiryYear))
      ?.id ?? "",
  );
  const [addressId, setAddressId] = useState(addresses[0]?.id ?? "");
  const [buyerSource, setBuyerSource] = useState<"new" | "saved">(
    profile.name && profile.cpfMask ? "saved" : "new",
  );
  const {
    register,
    handleSubmit,
    resetField,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormValues>({
    shouldUnregister: true,
    defaultValues: {
      buyer: { name: profile.name ?? "", cpf: "", save: false },
      address: { country: "BR", complement: "" },
      saveAddress: false,
      saveCard: false,
    },
  });
  return (
    <form
      aria-label="Confirmar checkout"
      noValidate
      aria-busy={isSubmitting}
      className="mt-8 space-y-8 rounded-panel border border-line bg-surface p-5 sm:p-7"
      onSubmit={handleSubmit(async (values) => {
        if (inFlight.current) return;
        setMessage("");
        setUncertain(false);
        if (method === "CARD" && !paymentMethodId) {
          const card = cardInputSchema.safeParse(values.card);
          if (!card.success) {
            const issue = card.error.issues[0];
            const field = issue.path[0];
            if (
              field === "number" ||
              field === "expiryMonth" ||
              field === "expiryYear"
            )
              setError(
                `card.${field}`,
                { message: issue.message },
                { shouldFocus: true },
              );
            return;
          }
        }
        const parsed = checkoutSchema.safeParse({
          checkoutKey: key,
          buyer:
            buyerSource === "saved"
              ? { source: "saved" }
              : {
                  ...values.buyer,
                  source: "new",
                  save: values.buyer.save ?? false,
                },
          ...(addressId
            ? { addressId }
            : {
                address: values.address,
                saveAddress: values.saveAddress ?? false,
              }),
          payment:
            method !== "CARD"
              ? { method }
              : paymentMethodId
                ? { method, paymentMethodId }
                : { method, card: values.card, save: values.saveCard ?? false },
        });
        if (!parsed.success) {
          setMessage(
            "Confira os dados do comprador, o endereço e a validade do cartão antes de confirmar.",
          );
          document.getElementById("checkout-feedback")?.focus();
          return;
        }
        inFlight.current = true;
        try {
          const result = await checkoutAction(parsed.data);
          if (result.success) router.push(`/account/orders/${result.orderId}`);
          else if (result.code === "UNAUTHENTICATED")
            router.replace(loginHref("/checkout"));
          else
            setMessage(
              failures[result.code] ??
                "Confirmação inválida. Confira os dados e tente novamente.",
            );
        } catch {
          setUncertain(true);
          setMessage(
            "Não foi possível confirmar o resultado. Consulte seus pedidos antes de tentar novamente com esta mesma confirmação.",
          );
        } finally {
          resetField("card.number", { defaultValue: "" });
          resetField("buyer.cpf", { defaultValue: "" });
          inFlight.current = false;
        }
      })}
    >
      <fieldset disabled={isSubmitting} className="min-w-0 space-y-8">
        <CheckoutBuyerFields
          profile={profile}
          source={buyerSource}
          onSourceChange={setBuyerSource}
          register={register}
          errors={errors}
        />
        <CheckoutAddressFields
          addresses={addresses}
          addressId={addressId}
          onAddressChange={setAddressId}
          register={register}
          errors={errors}
        />
        <fieldset className="space-y-5">
          <legend className="mb-4 font-editorial text-2xl text-coast">
            Pagamento simulado
          </legend>
          <FormField id="checkout-payment-method" label="Método de pagamento">
            <select
              id="checkout-payment-method"
              className="auth-input"
              value={method}
              onChange={(event) =>
                setMethod(
                  event.target.value === "CARD"
                    ? "CARD"
                    : event.target.value === "PIX"
                      ? "PIX"
                      : "BOLETO",
                )
              }
            >
              <option value="CARD">Cartão</option>
              <option value="PIX">Pix fictício</option>
              <option value="BOLETO">Boleto fictício</option>
            </select>
          </FormField>
          {method === "CARD" && (
            <CheckoutCardFields
              cards={cards}
              paymentMethodId={paymentMethodId}
              onCardChange={setPaymentMethodId}
              register={register}
              errors={errors}
            />
          )}
        </fieldset>
      </fieldset>
      <p>
        Nenhum dinheiro será movimentado. Pix e boleto convertem o carrinho em
        pedido pendente, sem reservar estoque; a disponibilidade será verificada
        na confirmação. Falhas e expiração não restauram o carrinho
        automaticamente.
      </p>
      <p className="text-sm text-muted">
        Ao confirmar, serão usados os preços vigentes. Os valores e a
        disponibilidade serão conferidos novamente; o carrinho não congela
        preços nem reserva estoque.
      </p>
      <Button
        type="submit"
        disabled={isSubmitting}
        aria-describedby="checkout-feedback"
      >
        {isSubmitting ? "Confirmando…" : "Confirmar pedido simulado"}
      </Button>
      <output
        id="checkout-feedback"
        tabIndex={-1}
        className="block text-danger"
      >
        {message}
      </output>
      {uncertain && (
        <Link href="/account/orders" className="auth-link inline-block">
          Consultar meus pedidos
        </Link>
      )}
    </form>
  );
}
