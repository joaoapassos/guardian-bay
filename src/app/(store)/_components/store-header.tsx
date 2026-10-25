import Link from "next/link";
import { UserMenu } from "@/features/auth/components/user-menu";
import { requireAuthenticatedAdmin } from "@/features/auth/server/require-admin";
import { getAuthenticatedIdentity } from "@/features/auth/server/session-cookie";
import { readPublicCategories } from "@/features/catalog/server/read-public-categories";
import { StoreNavigation } from "./store-navigation";
export async function StoreHeader() {
  const identity = await getAuthenticatedIdentity();
  const canAccessAdmin = identity
    ? (await requireAuthenticatedAdmin()).success
    : false;
  // Category failure must not remove navigation, search or account access.
  const categories = await readPublicCategories().catch(() => null);
  return (
    <StoreNavigation categories={categories}>
      {identity ? (
        <UserMenu label={identity.email} canAccessAdmin={canAccessAdmin} />
      ) : (
        <div className="flex items-center gap-4 text-sm">
          <Link className="store-nav-link" href="/login">
            Entrar
          </Link>
          <Link className="store-nav-link" href="/register">
            Criar conta
          </Link>
        </div>
      )}
    </StoreNavigation>
  );
}
