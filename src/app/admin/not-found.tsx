import Link from "next/link";
import { SystemState } from "@/components/shared/system-state";
export default function AdminNotFound() {
  return (
    <SystemState kind="not-found">
      <Link href="/admin" className="auth-link">
        Voltar ao Dashboard
      </Link>
    </SystemState>
  );
}
