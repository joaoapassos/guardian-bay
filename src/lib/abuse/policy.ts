export const abuseOperations = [
  "checkout",
  "admin.catalog",
  "admin.inventory",
  "payment.cards",
  "payment.confirm",
] as const;
export const abuseLimits = {
  checkout: 5,
  "admin.catalog": 30,
  "admin.inventory": 30,
  "payment.cards": 10,
  "payment.confirm": 20,
} as const;
export const abuseWindowSeconds = 60;
