import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PaymentMethodList } from "@/features/payments/components/payment-method-list";
import { readPaymentMethods } from "@/features/payments/server/payment-methods";
import { AccountShell } from "../../_components/account-shell";

export const metadata: Metadata = {
  title: "Formas de pagamento | Guardian Bay",
};

export default async function PaymentMethodsPage() {
  const result = await readPaymentMethods();
  if (!result.success) redirect("/login?returnTo=%2Faccount%2Fpayment-methods");
  return (
    <AccountShell
      active="payment-methods"
      title="Formas de pagamento"
      description="Gerencie até três cartões para suas compras simuladas."
    >
      <PaymentMethodList paymentMethods={result.paymentMethods} />
    </AccountShell>
  );
}
