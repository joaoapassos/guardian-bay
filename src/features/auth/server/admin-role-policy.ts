export function canManageUser(actorRole: string, targetRole: string) {
  if (!["customer", "admin", "superadmin"].includes(targetRole)) return false;
  return (
    actorRole === "superadmin" ||
    (actorRole === "admin" && targetRole === "customer")
  );
}
