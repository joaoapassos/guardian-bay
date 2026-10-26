"use client";
import { createContext } from "react";

export const CurtainContext = createContext({
  begin: (_href: string, _navigate: () => void): boolean => false,
  ready: (_href: string) => {},
});
