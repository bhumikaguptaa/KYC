"use client";

import { AnimatePresence, m } from "motion/react";
import { useScene } from "@/lib/scene-context";

/** Covers the canvas until the car is loaded, then fades away. The only loading state in the app. */
export function LoadingVeil() {
  const { modelReady } = useScene();
  return (
    <AnimatePresence>
      {!modelReady && (
        <m.div
          className="fixed inset-0 z-20 grid place-items-center bg-[#0a0a0b]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeOut" } }}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="text-sm font-medium tracking-[0.3em] text-white/80">KYC</div>
            <div className="h-px w-24 overflow-hidden bg-white/10">
              <m.div
                className="h-full w-1/3 bg-accent"
                animate={{ x: ["-100%", "300%"] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
