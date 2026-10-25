"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { logoutAction } from "../actions/logout.action";

export function useLogout() {
  const router = useRouter();
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function logout() {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setMessage("");
    try {
      const result = await logoutAction();
      if (result.success) {
        router.replace("/");
        router.refresh();
      } else setMessage("Não foi possível sair agora.");
    } catch {
      setMessage("Não foi possível sair agora. Tente novamente.");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }
  return { logout, pending, message };
}
