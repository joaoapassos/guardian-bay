"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ComponentProps, useContext } from "react";
import { CurtainContext } from "./curtain-context";

// Keep Next's navigation, prefetch, modifier keys, ref and history behavior.
export function ContextLink(props: ComponentProps<typeof Link>) {
  const path = usePathname();
  const curtain = useContext(CurtainContext);
  const href = typeof props.href === "string" ? props.href : "";
  const crossing =
    href.startsWith("/") &&
    !href.startsWith("//") &&
    path.startsWith("/admin") !== href.startsWith("/admin");
  return (
    <Link
      {...props}
      transitionTypes={crossing ? ["gb-curtain"] : props.transitionTypes}
      onNavigate={(event) => {
        props.onNavigate?.(event);
        if (crossing) curtain.begin(href);
      }}
    />
  );
}
