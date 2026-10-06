import "server-only";
import { readOwnIdentity } from "./read-own-identity";
import { getAuthenticatedIdentity } from "./session-cookie";

export async function readAccount() {
  const identity = await getAuthenticatedIdentity();
  if (!identity) return null;
  // No client resource ID; existing operation rechecks live session/ownership.
  const result = await readOwnIdentity({ userId: identity.id });
  return result.success ? { email: result.identity.email } : null;
}
