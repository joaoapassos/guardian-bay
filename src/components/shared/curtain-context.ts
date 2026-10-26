"use client";
import { createContext } from "react";

export const CurtainContext = createContext({
  begin: (_href: string) => {},
  ready: (_href: string) => {},
});
