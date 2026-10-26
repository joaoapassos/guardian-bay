export const abuseOperations = [
  "checkout",
  "cart.write",
  "admin.catalog",
  "admin.media",
  "admin.inventory",
  "payment.cards",
  "payment.confirm",
  "profile.write",
] as const;
export const abuseLimits = {
  checkout: 5,
  "cart.write": 60,
  "admin.catalog": 30,
  "admin.media": 10,
  "admin.inventory": 30,
  "payment.cards": 10,
  "payment.confirm": 20,
  "profile.write": 10,
} as const;
export const abuseWindowSeconds = 60;
