export function formatPostalCode(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length > 5
    ? `${digits.slice(0, 5)}-${digits.slice(5)}`
    : digits;
}

export function postalCodeCaret(value: string, offset: number): number {
  const digits = value.slice(0, offset).replace(/\D/g, "").length;
  return digits + (digits > 5 ? 1 : 0);
}
