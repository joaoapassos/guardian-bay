"use client";

import { usePathname } from "next/navigation";
import { type ReactNode, ViewTransition } from "react";

// One route-keyed owner: refresh, validation and pending changes do not animate.
// Server children stay in the Server graph; no navigation interception or timer.
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <ViewTransition
      key={pathname}
      default="none"
      enter="gb-page-enter"
      exit="gb-page-exit"
    >
      <div className="flex flex-1 flex-col">{children}</div>
    </ViewTransition>
  );
}
