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
    let completed = false;
    try {
      const result = await logoutAction();
      if (result.success) {
        completed = true;
        window.dispatchEvent(new Event("guardian:logout"));
        router.replace("/");
        router.refresh();
      } else setMessage("Não foi possível sair agora.");
    } catch {
      setMessage("Não foi possível sair agora. Tente novamente.");
    } finally {
      if (!completed) {
        inFlight.current = false;
        setPending(false);
      }
    }
  }
  return { logout, pending, message };
}
