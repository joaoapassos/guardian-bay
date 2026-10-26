"use client";

import { useRouter } from "next/navigation";
import { useContext, useRef, useState } from "react";
import { CurtainContext } from "@/components/shared/curtain-context";
import { navigationContext } from "@/components/shared/navigation-context";
import { logoutAction } from "../actions/logout.action";

export function useLogout() {
  const router = useRouter();
  const curtain = useContext(CurtainContext);
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
        window.dispatchEvent(new Event("guardian:logout"));
        const navigate = () => router.replace("/");
        if (
          navigationContext(window.location.pathname) !== "admin" ||
          !curtain.begin("/", navigate)
        )
          navigate();
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
