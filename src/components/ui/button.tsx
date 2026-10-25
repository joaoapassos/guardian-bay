import type { ComponentProps } from "react";
import { twMerge } from "tailwind-merge";

export function Button({
  className,
  type = "button",
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      type={type}
      className={twMerge(
        "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-control bg-coast px-5 py-3 text-base font-semibold text-paper transition-colors duration-180 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-coast disabled:cursor-wait disabled:bg-muted disabled:no-underline motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
}
