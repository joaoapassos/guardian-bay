"use client";

import type { ComponentProps } from "react";
import { formatPostalCode, postalCodeCaret } from "../postal-code";

export function PostalCodeInput({
  onChange,
  defaultValue,
  ...props
}: ComponentProps<"input">) {
  return (
    <input
      {...props}
      type="text"
      inputMode="numeric"
      maxLength={9}
      defaultValue={
        typeof defaultValue === "string"
          ? formatPostalCode(defaultValue)
          : defaultValue
      }
      onChange={(event) => {
        const input = event.currentTarget;
        const start = postalCodeCaret(
          input.value,
          input.selectionStart ?? input.value.length,
        );
        input.value = formatPostalCode(input.value);
        input.setSelectionRange(start, start);
        onChange?.(event);
      }}
    />
  );
}
