"use client";

import { useSyncExternalStore } from "react";

/**
 * A short tick under the finger when a control switches, like a physical switch. Android
 * browsers only (iOS Safari has no vibration API); does nothing elsewhere.
 */
export function tick(ms = 8) {
  try {
    navigator.vibrate?.(ms);
  } catch {}
}

/** Live media query, server-safe (false until hydrated). */
export function useMedia(query: string) {
  return useSyncExternalStore(
    (l) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", l);
      return () => mq.removeEventListener("change", l);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Tailwind's `sm` breakpoint: tablets and desktop get side panels, phones get bottom sheets. */
export const useWide = () => useMedia("(min-width: 640px)");

/** Remember a one-off hint was seen. Storage can throw (private mode), so it's wrapped. */
export function seen(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}
export function markSeen(key: string) {
  try {
    localStorage.setItem(key, "1");
  } catch {}
}
