export const abuseOperations = [
  "checkout",
  "admin.catalog",
  "admin.inventory",
] as const;
export const abuseLimits = {
  checkout: 5,
  "admin.catalog": 30,
  "admin.inventory": 30,
} as const;
export const abuseWindowSeconds = 60;
