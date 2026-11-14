"use client";

import { LazyMotion, domAnimation } from "motion/react";
import type { ReactNode } from "react";

/** Loads only the DOM animation features; use `m.div` etc. (not `motion.div`) everywhere. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}

/** The one spring the whole app uses, so every panel moves the same way. */
export const spring = { type: "spring", stiffness: 380, damping: 34, mass: 0.9 } as const;
