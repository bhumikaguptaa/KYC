"use client";

import { useState } from "react";
import type { QuoteItem } from "@/lib/quote";
import { QuoteCard, usd, type PriceStyle } from "./QuoteCard";

// TEMPORARY: the three designs for an above-average price, to compare on a real screen.
// Once one is chosen, delete this, the switcher below and the unused branches in QuoteCard.
const PRICE_STYLES: { id: PriceStyle; label: string }[] = [
  { id: "price", label: "Price" },
  { id: "note", label: "Note" },
  { id: "meter", label: "Meter" },
];
/** Remembered while the app stays open, so the choice survives a trip to the garage and back. */
let chosenStyle: PriceStyle = "price";

/** Every line of the quote, with a short summary on top. */
export function QuoteList({ items }: { items: QuoteItem[] }) {
  const [priceStyle, setPriceStyle] = useState<PriceStyle>(() => chosenStyle);

  if (!items.length) {
    return <p className="mt-4 rounded-2xl bg-white/[0.09] p-4 text-sm text-white/70">No repair lines found in this PDF.</p>;
  }

  const total = items.reduce((sum, i) => sum + i.amount, 0);
  const diy = items.filter((i) => i.canDIY);
  const diyTotal = diy.reduce((sum, i) => sum + i.amount, 0);
  const high = items.filter((i) => i.isHighPrice).length;

  return (
    <>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <Stat label="Repairs total" value={usd(total)} />
        <Stat label="You could do" value={diy.length ? usd(diyTotal) : "—"} tone="text-diy" />
        <Stat label="Above average" value={String(high)} tone={high ? "text-pricey" : undefined} />
      </dl>

      <div className="mt-3 flex items-center gap-1 text-xs text-white/50">
        <span className="mr-1">Above-average style (test):</span>
        {PRICE_STYLES.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              chosenStyle = s.id;
              setPriceStyle(s.id);
            }}
            aria-pressed={priceStyle === s.id}
            className={`min-h-9 rounded-full px-3 ${priceStyle === s.id ? "bg-white text-black" : "bg-white/10 text-white/75"}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <QuoteCard key={item.index} item={item} priceStyle={priceStyle} />
        ))}
      </ul>
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.09] px-3 py-2.5">
      <dt className="text-xs text-white/55">{label}</dt>
      <dd className={`mt-0.5 font-medium tabular-nums ${tone ?? "text-white/95"}`}>{value}</dd>
    </div>
  );
}
