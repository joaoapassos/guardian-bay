"use client";
import { usePathname } from "next/navigation";
import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { CurtainContext } from "./curtain-context";
import { navigationContext } from "./navigation-context";

type Intent = {
  sequence: number;
  from: string;
  href: string;
  started: number;
  phase: "entering" | "covered" | "exiting";
  ready: boolean;
  phaseStarted: number;
};
const CURTAIN_PHASE_MS = 500;
const CONTEXT_KEY = "guardian:navigation-context";

export function CurtainController({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [intent, setIntent] = useState<Intent | null>(null);
  const current = useRef<Intent | null>(null);
  const previousPath = useRef(path);
  const mounted = useRef(false);
  const sequence = useRef(0);
  const savedScroll = useRef<{ overflow: string; paddingRight: string } | null>(
    null,
  );
  const publish = useCallback((next: Intent | null) => {
    current.current = next;
    setIntent(next);
  }, []);
  const unlock = useCallback(() => {
    const root = document.documentElement;
    if (savedScroll.current) {
      root.style.overflow = savedScroll.current.overflow;
      root.style.paddingRight = savedScroll.current.paddingRight;
      savedScroll.current = null;
    }
    delete root.dataset.curtain;
  }, []);
  const release = useCallback(() => {
    const wasActive = Boolean(current.current);
    publish(null);
    unlock();
    if (wasActive)
      requestAnimationFrame(() =>
        document.getElementById("main-content")?.focus({ preventScroll: true }),
      );
  }, [publish, unlock]);
  const cover = useCallback(() => {
    const active = current.current;
    if (active?.phase === "entering")
      publish({ ...active, phase: "covered", phaseStarted: Date.now() });
  }, [publish]);
  const begin = useCallback(
    (href: string, navigate: () => void, alreadyCovered = false) => {
      const destination = new URL(href, window.location.origin);
      if (destination.origin !== window.location.origin) return false;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        release();
        return false;
      }
      const target = destination.pathname + destination.search;
      if (current.current?.href === target) {
        navigate();
        return true;
      }
      const root = document.documentElement;
      if (!savedScroll.current) {
        const gap = window.innerWidth - root.clientWidth;
        savedScroll.current = {
          overflow: root.style.overflow,
          paddingRight: root.style.paddingRight,
        };
        const padding =
          Number.parseFloat(getComputedStyle(root).paddingRight) || 0;
        root.style.overflow = "hidden";
        if (gap > 0) root.style.paddingRight = `${padding + gap}px`;
      }
      root.dataset.curtain = "active";
      publish({
        sequence: ++sequence.current,
        from: window.location.pathname,
        href: target,
        started: current.current?.started ?? Date.now(),
        phase: alreadyCovered ? "covered" : "entering",
        ready: false,
        phaseStarted: Date.now(),
      });
      // Navigation/authentication must never wait for an animation.
      navigate();
      return true;
    },
    [publish, release],
  );
  const ready = useCallback(
    (href: string) => {
      const active = current.current;
      if (active?.href === href) publish({ ...active, ready: true });
    },
    [publish],
  );

  useLayoutEffect(() => {
    let from = navigationContext(previousPath.current);
    if (!mounted.current) {
      try {
        const stored = sessionStorage.getItem(CONTEXT_KEY);
        if (stored === "admin" || stored === "store") from = stored;
      } catch {
        /* Storage is optional. */
      }
    }
    const to = navigationContext(path);
    const active = current.current;
    if (
      active &&
      path !== active.from &&
      active.href !== path + window.location.search
    ) {
      // Follow the actual redirect destination; never preserve private DOM.
      publish({ ...active, href: path + window.location.search, ready: false });
    } else if (!active && from !== to) {
      begin(path + window.location.search, () => {}, true);
    }
    previousPath.current = path;
    mounted.current = true;
    try {
      sessionStorage.setItem(CONTEXT_KEY, to);
    } catch {
      /* No persisted UI authority. */
    }
  }, [path, begin, publish]);

  useEffect(() => {
    if (!intent) return;
    const activeSequence = intent.sequence;
    const watchdog = setTimeout(
      release,
      Math.max(0, 5000 - (Date.now() - intent.started)),
    );
    const timer =
      intent.phase === "covered" && !intent.ready
        ? undefined
        : setTimeout(
            () => {
              const active = current.current;
              if (active?.sequence !== activeSequence) return;
              if (active.phase === "exiting") release();
              else if (active.phase === "entering") cover();
              else
                publish({
                  ...active,
                  phase: "exiting",
                  phaseStarted: Date.now(),
                });
            },
            intent.phase === "covered"
              ? 0
              : Math.max(
                  0,
                  CURTAIN_PHASE_MS + 50 - (Date.now() - intent.phaseStarted),
                ),
          );
    return () => {
      clearTimeout(watchdog);
      clearTimeout(timer);
    };
  }, [intent, publish, cover, release]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const click = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link =
        event.target instanceof Element
          ? event.target.closest("a[href]")
          : null;
      if (
        !(link instanceof HTMLAnchorElement) ||
        link.hasAttribute("download") ||
        (link.target && link.target !== "_self")
      )
        return;
      const destination = new URL(link.href, window.location.origin);
      if (
        destination.origin === window.location.origin &&
        navigationContext(window.location.pathname) !==
          navigationContext(destination.pathname)
      )
        begin(destination.href, () => {});
    };
    const pop = () => {
      if (
        navigationContext(previousPath.current) !==
        navigationContext(window.location.pathname)
      )
        begin(window.location.href, () => {});
      else release();
    };
    const reduced = () => {
      if (media.matches) release();
    };
    const visible = () => {
      if (!document.hidden) release();
    };
    const cancel = (event: KeyboardEvent) => {
      if (event.key === "Escape" && current.current) release();
    };
    const show = () => {
      if (current.current) release();
    };
    document.addEventListener("click", click, true);
    window.addEventListener("popstate", pop);
    window.addEventListener("pageshow", show);
    document.addEventListener("visibilitychange", visible);
    document.addEventListener("keydown", cancel);
    media.addEventListener("change", reduced);
    return () => {
      document.removeEventListener("click", click, true);
      window.removeEventListener("popstate", pop);
      window.removeEventListener("pageshow", show);
      document.removeEventListener("visibilitychange", visible);
      document.removeEventListener("keydown", cancel);
      media.removeEventListener("change", reduced);
      unlock();
    };
  }, [begin, release, unlock]);
  return (
    <CurtainContext value={{ begin, ready }}>
      <div inert={Boolean(intent)} className="flex flex-1 flex-col">
        {children}
      </div>
      {intent && (
        <div
          className="gb-curtain"
          data-phase={intent.phase}
          key={intent.sequence}
          style={
            {
              animationDuration: `${CURTAIN_PHASE_MS}ms`,
              "--curtain-phase-duration": `${CURTAIN_PHASE_MS}ms`,
            } as CSSProperties
          }
          onAnimationEnd={(event) => {
            if (
              event.target === event.currentTarget &&
              event.animationName === "gb-curtain-enter"
            )
              cover();
          }}
        >
          <span
            className="font-editorial text-3xl font-extrabold tracking-tight sm:text-5xl"
            aria-hidden="true"
          >
            GUARDIAN BAY
          </span>
          <output className="mt-5 text-sm">
            {intent.phase === "covered" && !intent.ready
              ? "Carregando página…"
              : "Abrindo página…"}
          </output>
          <button
            type="button"
            onClick={release}
            className="mt-6 cursor-pointer rounded-control border border-current px-4 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            Continuar navegação
          </button>
        </div>
      )}
    </CurtainContext>
  );
}
