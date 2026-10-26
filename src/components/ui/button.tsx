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
        "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-control border border-current bg-primary px-5 py-3 text-base font-semibold text-on-primary transition-colors duration-180 enabled:hover:bg-ink enabled:hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-coast disabled:cursor-wait disabled:bg-line disabled:text-body motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
}
