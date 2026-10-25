"use client";

import { Eye, EyeOff } from "lucide-react";
import { type ComponentProps, useState } from "react";
import { twMerge } from "tailwind-merge";
import { IconButton } from "@/components/ui/icon-button";

export function PasswordField({
  id,
  className,
  ...props
}: Omit<ComponentProps<"input">, "type"> & { id: string }) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;
  return (
    <div className="relative">
      <input
        {...props}
        id={id}
        type={visible ? "text" : "password"}
        className={twMerge("auth-input pr-12", className)}
      />
      <IconButton
        aria-controls={id}
        aria-pressed={visible}
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        onClick={() => setVisible((value) => !value)}
        className="absolute top-1/2 right-2 -translate-y-1/2"
      >
        <Icon size={18} aria-hidden="true" />
      </IconButton>
    </div>
  );
}
