"use client";

import { AnimatePresence, m } from "motion/react";
import { useScene } from "@/lib/scene-context";
import { IconBattery, IconLights, IconSignal, IconWarning } from "./icons";

/**
 * Covers the canvas until the car is loaded. It plays the bulb check every car does when you
 * turn the key: the tell-tales light up one after another, then the cluster goes dark and the
 * car appears. The four lamps are also the app's four colours, introduced before anything else.
 */
const LAMPS = [
  { Icon: IconBattery, className: "text-stop" },
  { Icon: IconWarning, className: "text-caution" },
  { Icon: IconSignal, className: "text-go" },
  { Icon: IconLights, className: "text-beam" },
];

export function LoadingVeil() {
  const { modelReady } = useScene();
  return (
    <AnimatePresence>
      {!modelReady && (
        <m.div
          className="fixed inset-0 z-40 grid place-items-center bg-ink"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 } }}
        >
          {/* Faint cluster ring behind the lamps. */}
          <div
            aria-hidden
            className="pointer-events-none absolute size-[min(70vw,420px)] rounded-full opacity-60"
            style={{ background: "radial-gradient(closest-side, rgb(107 151 255 / 0.07), transparent)" }}
          />
          <m.div
            className="relative flex flex-col items-center"
            exit={{ scale: 1.06, filter: "blur(6px)", transition: { duration: 0.7, ease: "easeIn" } }}
          >
            <div className="flex items-center gap-5" role="status" aria-label="Loading your car">
              {LAMPS.map(({ Icon, className }, i) => (
                <m.span
                  key={i}
                  className={className}
                  initial={{ opacity: 0.08 }}
                  animate={{ opacity: [0.08, 1, 1, 0.35] }}
                  transition={{ duration: 2.4, times: [0, 0.12, 0.6, 1], delay: 0.25 + i * 0.14, repeat: Infinity, repeatDelay: 0.4 }}
                  style={{ filter: "drop-shadow(0 0 10px currentColor)" }}
                >
                  <Icon width={26} height={26} strokeWidth={1.7} />
                </m.span>
              ))}
            </div>
            <div className="mt-9 text-[13px] font-semibold tracking-[0.5em] text-chalk/90 pl-[0.5em]">KYC</div>
            <div className="gauge-label mt-2">Starting up</div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
