"use client";

import { LazyMotion, MotionConfig, domMax } from "motion/react";
import type { ReactNode } from "react";

/**
 * Motion for the whole app. domMax (not domAnimation) because the UI uses shared-layout
 * animations (the sliding mode switch) and drag (the part sheet). Use `m.div`, not `motion.div`.
 * reducedMotion="user": people who ask their OS for less motion get fades instead of movement.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

/** The one spring the whole app uses, so every panel moves the same way. */
export const spring = { type: "spring", stiffness: 380, damping: 34, mass: 0.9 } as const;
/** Softer, for big surfaces entering (sheets, the start panel). */
export const glide = { type: "spring", stiffness: 210, damping: 30, mass: 1 } as const;
