import "server-only";
import { getAuthenticatedIdentity } from "./session-cookie";

export async function readAccount() {
  const identity = await getAuthenticatedIdentity();
  // This read has no external resource ID. resolveSession joins this request's
  // live session to its owner and checks idle/absolute expiry in the same query.
  // Do not share/cache identity across requests or reuse it to authorize writes.
  return identity ? { email: identity.email } : null;
}
