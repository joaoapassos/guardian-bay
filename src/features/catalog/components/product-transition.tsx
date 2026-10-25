"use client";
import { ViewTransition } from "react";
export function ProductTransition({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <ViewTransition
      name={`gb-product-${id}`}
      default="none"
      share="gb-product-morph"
      enter="gb-product-reveal"
    >
      {children}
    </ViewTransition>
  );
}
