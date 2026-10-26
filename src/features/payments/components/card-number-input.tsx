"use client";
import type { ComponentProps } from "react";

export function CardNumberInput({
  onChange,
  ...props
}: Omit<ComponentProps<"input">, "type" | "inputMode" | "maxLength">) {
  return (
    <input
      {...props}
      type="text"
      inputMode="numeric"
      maxLength={23}
      placeholder="0000 0000 0000 0000"
      onChange={(event) => {
        const input = event.currentTarget;
        const digitsBeforeCaret = input.value
          .slice(0, input.selectionStart ?? input.value.length)
          .replace(/\D/g, "").length;
        const digits = input.value.replace(/\D/g, "").slice(0, 19);
        const groups = /^3[47]/.test(digits) ? [4, 6, 5, 4] : [4, 4, 4, 4, 3];
        let offset = 0;
        input.value = groups
          .map((length) => {
            const group = digits.slice(offset, offset + length);
            offset += length;
            return group;
          })
          .filter(Boolean)
          .join(" ");
        let caret = 0;
        let count = 0;
        while (caret < input.value.length && count < digitsBeforeCaret) {
          if (/\d/.test(input.value[caret])) count++;
          caret++;
        }
        input.setSelectionRange(caret, caret);
        onChange?.(event);
      }}
    />
  );
}
