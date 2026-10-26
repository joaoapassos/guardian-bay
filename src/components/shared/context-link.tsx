"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ComponentProps, useContext } from "react";
import { CurtainContext } from "./curtain-context";
import { navigationContext } from "./navigation-context";

// Next Link retains prefetch and native click semantics; context navigation
// starts immediately; the root also handles plain links and redirect commits.
export function ContextLink(props: ComponentProps<typeof Link>) {
  const path = usePathname();
  const router = useRouter();
  const curtain = useContext(CurtainContext);
  const href = typeof props.href === "string" ? props.href : "";
  const crossing =
    href.startsWith("/") &&
    !href.startsWith("//") &&
    navigationContext(path) !==
      navigationContext(new URL(href, "http://local").pathname);
  return (
    <Link
      {...props}
      transitionTypes={crossing ? ["gb-curtain"] : props.transitionTypes}
      onNavigate={(event) => {
        let cancelled = false;
        props.onNavigate?.({
          preventDefault() {
            cancelled = true;
            event.preventDefault();
          },
        });
        if (cancelled || !crossing) return;
        const deferred = curtain.begin(href, () => {
          const options = {
            scroll: props.scroll,
            transitionTypes: ["gb-curtain"],
          };
          if (props.replace) router.replace(href, options);
          else router.push(href, options);
        });
        if (deferred) event.preventDefault();
      }}
    />
  );
}
