import type { ComponentProps } from "react";
import { twMerge } from "tailwind-merge";

export function IconButton({
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { "aria-label": string }) {
  return (
    <button
      type={type}
      {...props}
      className={twMerge(
        "inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent p-0 text-coast hover:bg-transparent hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coast disabled:cursor-not-allowed disabled:text-muted",
        className,
      )}
    />
  );
}
