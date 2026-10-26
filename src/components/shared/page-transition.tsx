"use client";

import { usePathname } from "next/navigation";
import { type ReactNode, ViewTransition } from "react";

// One route-keyed owner: refresh, validation and pending changes do not animate.
// Server children stay in the Server graph; no navigation interception or timer.
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Product image boundaries own catalog/detail continuity. Do not animate
  // their ancestor snapshot as well; streaming may safely omit the morph.
  const productContext = pathname === "/" || pathname.startsWith("/products");
  return (
    <ViewTransition
      key={pathname}
      default="none"
      enter={{
        default: productContext ? "none" : "gb-page-enter",
        "gb-curtain": "none",
      }}
      exit={{
        default: productContext ? "none" : "gb-page-exit",
        "gb-curtain": "none",
      }}
    >
      <div className="flex flex-1 flex-col">{children}</div>
    </ViewTransition>
  );
}
