export function navigationContext(pathname: string): "admin" | "store" {
  return pathname === "/admin" || pathname.startsWith("/admin/")
    ? "admin"
    : "store";
}
