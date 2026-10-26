import { redirect } from "next/navigation";
export default function CartAlias() {
  redirect("/products?cart=open");
}
