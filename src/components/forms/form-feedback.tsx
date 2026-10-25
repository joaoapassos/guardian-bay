"use client";

import { useEffect, useRef } from "react";

export type FormMessage = { text: string; kind: "error" | "info" } | null;

export function FormFeedback({ message }: { message: FormMessage }) {
  const output = useRef<HTMLOutputElement>(null);
  useEffect(() => {
    if (message) output.current?.focus();
  }, [message]);
  return (
    <output
      ref={output}
      tabIndex={-1}
      className={
        message
          ? `block rounded-control border bg-surface p-4 text-sm leading-relaxed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coast ${message.kind === "error" ? "border-danger text-danger" : "border-coast text-ink"}`
          : "block empty:hidden"
      }
    >
      {message?.text}
    </output>
  );
}
