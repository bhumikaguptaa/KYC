"use client";

import { useId, useState } from "react";
import { m } from "motion/react";

/**
 * VIN entry, drawn as the 17-character readout it is, split into its three real sections so the
 * field teaches what a VIN is while you type it. A real <input> sits on top (transparent), so
 * typing, pasting, autofill and screen readers all behave like any text field.
 */
const GROUPS = [
  { from: 0, to: 3, label: "Maker" },
  { from: 3, to: 9, label: "Model" },
  { from: 9, to: 17, label: "Year · serial" },
];

export type PlateState = "idle" | "busy" | "ok" | "error";

export function VinPlate({
  value,
  onChange,
  state,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  state: PlateState;
  autoFocus?: boolean;
}) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const chars = value.split("");

  return (
    <m.div
      // A shake on error, like a "no" head-shake; nothing on success but a green settle.
      animate={state === "error" ? { x: [0, -7, 7, -5, 5, -2, 0] } : { x: 0 }}
      transition={{ duration: 0.45 }}
      className={`relative overflow-hidden rounded-2xl border px-3 pb-2.5 pt-3.5 transition-colors duration-300 sm:px-4 ${
        state === "error"
          ? "border-stop/50 bg-stop/[0.04]"
          : state === "ok"
            ? "border-go/45 bg-go/[0.04]"
            : focused
              ? "border-beam/55 bg-white/[0.045]"
              : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <label htmlFor={id} className="sr-only">
        Vehicle identification number (17 characters)
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase().replace(/[^A-Z0-9*]/g, "").slice(0, 17))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoFocus={autoFocus}
        inputMode="text"
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        maxLength={17}
        // 16px text so iOS doesn't zoom in on focus; the text itself is invisible.
        className="absolute inset-0 z-10 w-full cursor-text bg-transparent text-base text-transparent caret-transparent outline-none selection:bg-transparent"
      />

      <div aria-hidden className="flex gap-[clamp(6px,2vw,14px)] font-mono text-[clamp(18px,5.4vw,24px)] leading-none">
        {GROUPS.map((g, gi) => (
          // Each section is as wide as its share of the 17 characters, so the slots spread evenly.
          <div key={gi} className="flex min-w-0 flex-col items-center" style={{ flex: g.to - g.from }}>
            <div className="flex w-full">
              {Array.from({ length: g.to - g.from }, (_, k) => {
                const i = g.from + k;
                const ch = chars[i];
                const isCaret = focused && i === value.length;
                return (
                  <span key={i} className="relative grid h-[1.45em] min-w-[0.7em] flex-1 place-items-center">
                    {ch ? (
                      <m.span
                        key={ch + i}
                        initial={{ y: 7, opacity: 0, filter: "blur(3px)" }}
                        animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                        transition={{ type: "spring", stiffness: 520, damping: 32 }}
                        className={state === "ok" ? "text-go" : "text-chalk"}
                      >
                        {ch}
                      </m.span>
                    ) : (
                      <span className="text-white/18">·</span>
                    )}
                    {isCaret && <span className="caret-blink absolute bottom-[0.18em] h-[2px] w-[0.6em] rounded bg-beam" />}
                  </span>
                );
              })}
            </div>
            {/* Bracket under each section, then its name. */}
            <div className="mt-1.5 h-1 w-[calc(100%-6px)] rounded-b border-x border-b border-white/15" />
            <div className="gauge-label mt-1.5 !text-[9.5px] !tracking-[0.14em]">{g.label}</div>
          </div>
        ))}
      </div>

      {/* Reading sweep while the VIN is being decoded. */}
      {state === "busy" && (
        <m.div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 w-1/3"
          style={{ background: "linear-gradient(90deg, transparent, rgb(107 151 255 / 0.22), transparent)" }}
          initial={{ x: "-100%" }}
          animate={{ x: "320%" }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </m.div>
  );
}
