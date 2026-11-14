"use client";

import { useSyncExternalStore } from "react";

/** Chrome's install event (Android and desktop). iOS has no equivalent. */
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let installEvent: InstallEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

// Chrome fires this once, early. Catch it at module load so no page misses it.
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    installEvent = e as InstallEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    installEvent = null;
    emit();
  });
}

const subscribeInstall = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

/** A function that opens the browser's install dialog, or null when the browser offers none. */
export function useInstallPrompt() {
  const event = useSyncExternalStore(subscribeInstall, () => installEvent, () => null);
  if (!event) return null;
  return async () => {
    await event.prompt();
    await event.userChoice;
    installEvent = null;
    emit();
  };
}

function mediaStore(query: string) {
  return (l: () => void) => {
    const mq = window.matchMedia(query);
    mq.addEventListener("change", l);
    return () => mq.removeEventListener("change", l);
  };
}
const subscribeStandalone = mediaStore("(display-mode: standalone)");

/** True when running from the home screen (no browser bars). */
export function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari's older, non-standard flag
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
export function useStandalone() {
  return useSyncExternalStore(subscribeStandalone, isStandalone, () => false);
}

/** iPhone or iPad (iPadOS reports itself as a Mac with a touch screen). */
export function isIos() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}
const noop = () => () => {};
export function useIsIos() {
  return useSyncExternalStore(noop, isIos, () => false);
}

function subscribeOnline(l: () => void) {
  window.addEventListener("online", l);
  window.addEventListener("offline", l);
  return () => {
    window.removeEventListener("online", l);
    window.removeEventListener("offline", l);
  };
}
/** False when the device has no network. */
export function useOnline() {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}
