export function orderStatusLabel(status: string) {
  return status === "PAID"
    ? "Pagamento simulado aprovado"
    : status === "PAYMENT_FAILED"
      ? "Pagamento simulado recusado"
      : status === "PAYMENT_EXPIRED"
        ? "Pagamento simulado expirado"
        : "Pagamento pendente";
}

export function paymentMethodLabel(method?: string) {
  return method === "CARD"
    ? "Cartão fictício"
    : method === "PIX"
      ? "Pix fictício"
      : method === "BOLETO"
        ? "Boleto fictício"
        : "Simulação legada";
}
