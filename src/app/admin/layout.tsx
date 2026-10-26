import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SystemState } from "@/components/shared/system-state";
import { UserMenu } from "@/features/auth/components/user-menu";
import { loginHref } from "@/features/auth/safe-return";
import { requireAuthenticatedAdmin } from "@/features/auth/server/require-admin";
import { getAuthenticatedIdentity } from "@/features/auth/server/session-cookie";
import { AdminNavigation } from "./_components/admin-navigation";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await requireAuthenticatedAdmin();
  if (!access.success) {
    if (access.code === "UNAUTHENTICATED")
      redirect(
        loginHref((await headers()).get("x-guardian-return-to") ?? "/admin"),
      );
    return <SystemState kind="access-denied" />;
  }
  const identity = await getAuthenticatedIdentity();
  return (
    <div className="admin-shell grid flex-1 font-auth lg:grid-cols-[260px_minmax(0,1fr)]">
      <AdminNavigation />
      <div className="min-w-0">
        <header className="flex flex-wrap items-center justify-end gap-3 border-b border-line bg-surface px-5 py-4 sm:px-8 lg:px-10">
          <UserMenu
            label={identity?.name ?? identity?.email ?? "Minha conta"}
            canAccessAdmin
            context="admin"
          />
        </header>
        {children}
      </div>
    </div>
  );
}
