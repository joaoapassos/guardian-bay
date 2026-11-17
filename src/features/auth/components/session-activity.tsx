"use client";
import { useEffect } from "react";
import { recordActivityAction } from "../actions/record-activity.action";
import { createActivityReporter } from "./session-activity-policy";

export function SessionActivity() {
  useEffect(() => {
    const report = createActivityReporter(recordActivityAction, () => ({
      now: performance.now(),
      visible: document.visibilityState === "visible",
    }));
    const onActivity = () => {
      void report();
    };
    const onLogout = () => report.stop();
    const onIdentityChanged = () => report.resume();
    window.addEventListener("guardian:logout", onLogout);
    window.addEventListener("guardian:identity-changed", onIdentityChanged);
    const events = ["pointerdown", "keydown", "wheel", "popstate"] as const;
    for (const event of events)
      window.addEventListener(event, onActivity, { passive: true });
    return () => {
      window.removeEventListener("guardian:logout", onLogout);
      window.removeEventListener(
        "guardian:identity-changed",
        onIdentityChanged,
      );
      for (const event of events) window.removeEventListener(event, onActivity);
    };
  }, []);
  return null;
}
