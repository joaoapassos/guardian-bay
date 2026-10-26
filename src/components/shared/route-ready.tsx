"use client";
import { usePathname } from "next/navigation";
import { useContext, useEffect } from "react";
import { CurtainContext } from "./curtain-context";

// Compose inside resolved critical Server content; loading fallbacks omit it.
export function RouteReady() {
  const path = usePathname();
  const { ready } = useContext(CurtainContext);
  useEffect(() => {
    ready(path + window.location.search);
  }, [path, ready]);
  return null;
}
