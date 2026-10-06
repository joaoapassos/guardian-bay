export function orderStatusLabel(status: string) {
  return status === "PAID"
    ? "Pagamento simulado aprovado"
    : status === "PAYMENT_FAILED"
      ? "Pagamento simulado recusado"
      : "Pagamento pendente";
}
