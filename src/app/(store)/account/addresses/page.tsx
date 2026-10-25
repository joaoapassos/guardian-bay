import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AddressList } from "@/features/addresses/components/address-list";
import { readAddresses } from "@/features/addresses/server/read-addresses";
import { AccountShell } from "../../_components/account-shell";

export const metadata: Metadata = { title: "Endereços | Guardian Bay" };
export default async function AddressesPage() {
  const result = await readAddresses();
  if (!result.success) redirect("/login");
  return (
    <AccountShell
      active="addresses"
      title="Meus endereços"
      description="Salve seus endereços no Brasil para usar na finalização da compra."
    >
      <AddressList addresses={result.addresses} />
    </AccountShell>
  );
}
