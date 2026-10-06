export const auditEventTypes = [
  "auth.login.succeeded",
  "auth.password.changed",
  "auth.sessions.revoked",
  "auth.abuse.threshold_reached",
  "admin.category.created",
  "admin.category.updated",
  "admin.product.created",
  "admin.product.updated",
  "admin.product.published",
  "admin.product.unpublished",
  "admin.inventory.updated",
  "order.completed",
] as const;
export const auditOutcomes = [
  "SUCCESS",
  "FAILED",
  "THRESHOLD_REACHED",
] as const;
export const auditTargetTypes = [
  "user",
  "category",
  "product",
  "inventory",
  "order",
] as const;
