"use client";

import { useEffect, useState } from "react";
import { useSerwist } from "@serwist/next/react";
import { AnimatePresence, m } from "motion/react";
import { isStandalone, useOnline } from "@/lib/pwa";
import { spring } from "./MotionProvider";
import { Lamp } from "./status";

/**
 * App-level PWA behaviour that has no page of its own: the "update available" prompt, the
 * offline notice, asking the browser to keep our offline data, and blocking page zoom gestures.
 * Both notices are tell-tales: blue for "something new is ready", amber for "running limited".
 */
export function PwaChrome() {
  const { serwist } = useSerwist();
  const online = useOnline();
  const [updateReady, setUpdateReady] = useState(false);

  // Update flow: a new version downloads in the background and waits. We offer a reload; if the
  // user ignores it, the new version takes over the next time the app is opened from scratch.
  useEffect(() => {
    if (!serwist) return;
    const onWaiting = () => setUpdateReady(true);
    serwist.addEventListener("waiting", onWaiting);
    // Installed apps are resumed far more often than reloaded, so look for updates on resume.
    const onVisible = () => {
      if (document.visibilityState === "visible" && navigator.onLine) void serwist.update().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      serwist.removeEventListener("waiting", onWaiting);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [serwist]);

  useEffect(() => {
    // Ask the browser not to evict the cached model and app shell once the app is installed.
    if (isStandalone()) void navigator.storage?.persist?.().catch(() => {});
    // Safari-only pinch events: stop the page itself from zooming. The canvas handles its own pinch.
    const stop = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", stop);
    return () => document.removeEventListener("gesturestart", stop);
  }, []);

  const reload = () => {
    if (!serwist) return;
    serwist.addEventListener("controlling", () => window.location.reload());
    serwist.messageSkipWaiting();
  };

  return (
    <div className="safe-area pointer-events-none fixed inset-x-0 top-0 z-30 flex justify-center px-4">
      <AnimatePresence>
        {updateReady ? (
          <m.div
            key="update"
            role="status"
            className="glass pointer-events-auto mt-3 flex items-center gap-3 rounded-full py-1.5 pl-4 pr-1.5 text-sm"
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            transition={spring}
          >
            <Lamp className="text-beam" size={7} />
            A new version is ready
            <button
              onClick={reload}
              className="min-h-9 rounded-full bg-chalk px-4 text-sm font-semibold text-ink transition active:scale-95"
            >
              Update
            </button>
          </m.div>
        ) : !online ? (
          <m.div
            key="offline"
            role="status"
            className="glass mt-3 flex items-center gap-2.5 rounded-full px-4 py-2 text-[13px] text-chalk/80"
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            transition={spring}
          >
            <Lamp className="text-caution" size={7} />
            Offline. Your car still works; VIN and recall lookups need a connection.
          </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
