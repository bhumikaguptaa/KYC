"use client";

import { useEffect, useRef, useState } from "react";
import { animate, m } from "motion/react";
import { partById } from "@/lib/car";
import type { PartId, QuoteItem } from "@/lib/quote";
import { tick } from "@/lib/ui";

export const usd = (n: number, cents = true) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 })}`;

/** Rubber-stamp inks on the paper: the dashboard's go green and stop red, darkened to read on cream. */
const STAMP = {
  DIY: "text-[#12804a] border-[#12804a]",
  SHOP: "text-[#c4271c] border-[#c4271c]",
} as const;

/** The slip's paper: perforated top and bottom edges, cut with a mask. */
const PERFORATION =
  "radial-gradient(circle 5px at 50% 0, transparent 98%, #000) top/14px 51% repeat-x, radial-gradient(circle 5px at 50% 100%, transparent 98%, #000) bottom/14px 51% repeat-x";

/**
 * A repair quote, reprinted as a shop's paper repair order and marked up the way a friend who
 * knows cars would: a green DIY or red SHOP stamp on every line, and an amber highlighter over
 * any price that looks high. The stamps land one line at a time once `play` is true.
 *
 * Lines that match a part are tappable (`onPick`), so the car can fly to that part; do-it-yourself
 * lines get a "Show me how" link (`onGuide`).
 */
export function QuoteSlip({
  items,
  vehicle,
  play = true,
  sample = false,
  selected = null,
  onPick,
  onGuide,
}: {
  items: QuoteItem[];
  /** "2018 HONDA CIVIC TYPE R", printed on the slip */
  vehicle?: string | null;
  play?: boolean;
  /** made-up prices: the slip says so */
  sample?: boolean;
  selected?: string | null;
  onPick?: (part: PartId | null) => void;
  onGuide?: (part: PartId) => void;
}) {
  const [stamped, setStamped] = useState(0);
  const [diyShown, setDiyShown] = useState(0);
  const total = items.reduce((a, i) => a + i.amount, 0);
  const diyLines = items.filter((i) => i.canDIY);
  const diy = diyLines.reduce((a, i) => a + i.amount, 0);
  const high = items.filter((i) => i.isHighPrice).length;
  const done = stamped >= items.length;

  // Stamp one line every 380 ms; a new quote (or leaving view) starts over.
  useEffect(() => {
    if (!play) return;
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      setStamped(n);
      tick(12);
      if (n >= items.length) clearInterval(id);
    }, 380);
    return () => {
      clearInterval(id);
      setStamped(0);
      setDiyShown(0);
    };
  }, [play, items]);

  // Then count up what you could do yourself.
  useEffect(() => {
    if (!play || !done) return;
    const c = animate(0, diy, { duration: 1.1, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setDiyShown(v) });
    return () => c.stop();
  }, [play, done, diy]);

  return (
    <div
      className="relative px-5 pb-7 pt-8 font-mono text-[12px] text-[#1b1b1d] shadow-[0_40px_80px_-30px_rgb(0_0_0/0.9)] sm:px-6"
      style={{ background: "linear-gradient(180deg, #f5f2ea, #ece7da)", WebkitMask: PERFORATION, mask: PERFORATION }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[15px] font-bold tracking-[0.18em]">REPAIR ORDER</div>
          <div className="mt-1 text-[#1b1b1d]/60">MARKED UP BY KYC</div>
        </div>
        {sample && (
          <div className="rounded-sm border border-[#1b1b1d]/40 px-1.5 py-0.5 text-[10px] tracking-[0.2em] text-[#1b1b1d]/60">SAMPLE</div>
        )}
      </div>
      <div className="mt-4 border-y border-dashed border-[#1b1b1d]/30 py-2 uppercase text-[#1b1b1d]/75">
        Vehicle: {vehicle || "Not given"}
        <br />
        {items.length} line{items.length === 1 ? "" : "s"} · {diyLines.length} you could do yourself
      </div>

      {items.length === 0 ? (
        <p className="py-8 text-center text-[13px] leading-relaxed">
          NO REPAIR LINES FOUND
          <br />
          <span className="text-[#1b1b1d]/55">Check that the PDF is the shop&apos;s quote or estimate.</span>
        </p>
      ) : (
        <ul className="mt-1">
          {items.map((item, i) => (
            <SlipLine
              key={item.index}
              item={item}
              at={i}
              stamped={i < stamped}
              selected={!!item.relevantPart && selected === item.relevantPart}
              onPick={onPick}
              onGuide={onGuide}
            />
          ))}
        </ul>
      )}

      {items.length > 0 && (
        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between text-[#1b1b1d]/70">
            <span>SHOP TOTAL</span>
            <span className="tabular-nums">{usd(total)}</span>
          </div>
          {high > 0 && (
            <div className="flex justify-between text-[#8a5200]">
              <span>PRICES THAT LOOK HIGH</span>
              <span className="tabular-nums">
                {high} line{high === 1 ? "" : "s"}
              </span>
            </div>
          )}
          <div className="flex justify-between text-[14px] font-bold text-[#12804a]">
            <span>YOU COULD DO YOURSELF</span>
            <span className="tabular-nums">{usd(diyShown)}</span>
          </div>
        </div>
      )}
      <p className="mt-5 text-center text-[10px] leading-relaxed tracking-[0.14em] text-[#1b1b1d]/45">
        {sample ? "SAMPLE QUOTE · MADE-UP PRICES" : "“HIGH” IS AN ESTIMATE AGAINST TYPICAL US SHOP PRICES"}
      </p>
    </div>
  );
}

function SlipLine({
  item,
  at,
  stamped,
  selected,
  onPick,
  onGuide,
}: {
  item: QuoteItem;
  at: number;
  stamped: boolean;
  selected: boolean;
  onPick?: (part: PartId | null) => void;
  onGuide?: (part: PartId) => void;
}) {
  const part = partById(item.relevantPart);
  const pickable = !!(onPick && item.relevantPart);
  const stamp = item.canDIY ? "DIY" : "SHOP";
  // Picked from the car (a pin tap): bring the line into view.
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selected]);

  return (
    <m.li
      ref={ref}
      className={`relative -mx-2 border-b border-dotted border-[#1b1b1d]/25 px-2 py-3 transition-colors duration-300 ${
        selected ? "bg-[#6b97ff]/[0.14]" : ""
      }`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + at * 0.06, duration: 0.35 }}
    >
      {/* The whole line picks its part; the how-to link sits above this. */}
      {pickable && (
        <button
          aria-label={`Show ${part?.label ?? "this part"} on the car`}
          aria-pressed={selected}
          onClick={() => {
            tick();
            onPick?.(selected ? null : item.relevantPart);
          }}
          className="absolute inset-0 z-0 cursor-pointer"
        />
      )}
      <span
        aria-hidden
        className={`absolute inset-y-1 left-0 w-[3px] rounded-full bg-[#3f6fe0] transition-transform duration-300 ${selected ? "scale-y-100" : "scale-y-0"}`}
      />

      <div className="pointer-events-none relative flex items-start gap-3">
        <span className="w-5 shrink-0 tabular-nums text-[#1b1b1d]/45">{String(item.index).padStart(2, "0")}</span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold uppercase leading-snug">{item.description}</div>
          <div className="mt-0.5 text-[#1b1b1d]/55">
            {part ? (
              <>
                {part.label}
                {pickable && <span className="text-[#3f6fe0]"> · {selected ? "on the car" : "show on car"}</span>}
              </>
            ) : (
              "Not a part on the 3D car"
            )}
          </div>
          {/* The verdict: a rubber stamp, and for do-it-yourself lines the way to the how-to. */}
          <div className="mt-2.5 flex min-h-10 items-center gap-3">
            <span className="relative inline-grid">
              {/* Placeholder keeps the line from jumping when the stamp lands. */}
              <span aria-hidden className="invisible border-[2.5px] px-2 py-0.5 text-[13px] font-black tracking-[0.18em]">
                {stamp}
              </span>
              {stamped && (
                <m.span
                  aria-label={item.canDIY ? "You could do this yourself" : "A job for the shop"}
                  className={`absolute inset-0 rounded-[3px] border-[2.5px] px-2 py-0.5 text-[13px] font-black tracking-[0.18em] mix-blend-multiply ${STAMP[stamp]}`}
                  initial={{ scale: 2.4, opacity: 0, rotate: -24 }}
                  animate={{ scale: 1, opacity: 0.88, rotate: at % 2 ? 4 : -5 }}
                  transition={{ type: "spring", stiffness: 700, damping: 22 }}
                  style={{ maskImage: "radial-gradient(circle at 30% 40%, #000 60%, rgb(0 0 0 / 0.75))" }}
                >
                  {stamp}
                </m.span>
              )}
            </span>
            {item.canDIY && part && onGuide && (
              <button
                onClick={() => {
                  tick();
                  onGuide(part.id as PartId);
                }}
                className="pointer-events-auto relative z-10 inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#1b1b1d] px-4 text-[12px] font-semibold tracking-wide text-[#f5f2ea] transition active:scale-95"
              >
                Show me how <span aria-hidden>→</span>
              </button>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <span className="relative inline-block px-1 tabular-nums">
            {/* Amber highlighter swiped over a price that looks high. */}
            {item.isHighPrice && (
              <m.span
                aria-hidden
                className="absolute -inset-x-0.5 inset-y-[-1px] -skew-x-6 origin-left rounded-[2px] bg-[#ffb224]/75 mix-blend-multiply"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: stamped ? 1 : 0 }}
                transition={{ duration: 0.45, ease: [0.65, 0, 0.35, 1], delay: 0.18 }}
              />
            )}
            <span className="relative">{usd(item.amount)}</span>
          </span>
          {item.isHighPrice && (
            <div className={`mt-1 text-[10px] font-semibold tracking-[0.12em] text-[#8a5200] transition-opacity duration-300 ${stamped ? "" : "opacity-0"}`}>
              ▲ LOOKS HIGH
            </div>
          )}
        </div>
      </div>

    </m.li>
  );
}
