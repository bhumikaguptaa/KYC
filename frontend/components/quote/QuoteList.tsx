"use client";

import type { QuoteItem } from "@/lib/quote";
import { QuoteCard, usd } from "./QuoteCard";

/** Every line of the quote, with a short summary on top. */
export function QuoteList({ items }: { items: QuoteItem[] }) {
  if (!items.length) {
    return <p className="mt-4 rounded-2xl bg-white/[0.04] p-4 text-sm text-white/60">No repair lines found in this PDF.</p>;
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
        <Stat label="High prices" value={String(high)} tone={high ? "text-shop" : undefined} />
      </dl>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <QuoteCard key={item.index} item={item} />
        ))}
      </ul>
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.04] px-3 py-2.5">
      <dt className="text-xs text-white/45">{label}</dt>
      <dd className={`mt-0.5 font-medium tabular-nums ${tone ?? "text-white/90"}`}>{value}</dd>
    </div>
  );
}
