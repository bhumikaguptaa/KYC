"use client";

import { useRouter } from "next/navigation";
import { partById } from "@/lib/car";
import type { QuoteItem } from "@/lib/quote";

export const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

/**
 * Who should do the job. Every line gets exactly one:
 * - diy: the app marks the part as do-it-yourself, and the line is a simple job on it
 * - careful: the part is marked "advanced" in lib/car.ts: possible at home, but easy to get wrong
 * - mechanic: everything else, including lines that match no part in the app
 */
export type QuoteStatus = "diy" | "careful" | "mechanic";

export function quoteStatus(item: QuoteItem): QuoteStatus {
  const part = partById(item.relevantPart);
  if (item.canDIY && part) return "diy";
  if (part?.status === "advanced") return "careful";
  return "mechanic";
}

const STATUS: Record<QuoteStatus, { label: string; className: string }> = {
  diy: { label: "Do it yourself", className: "bg-diy/20 text-diy" },
  careful: { label: "Careful", className: "bg-careful/20 text-careful" },
  mechanic: { label: "Mechanic", className: "bg-shop/20 text-shop" },
};

/**
 * How an above-average price is shown. It is deliberately not a pill: the pill says who does the
 * job, and the price is a separate fact. Three designs to compare (TEMPORARY: keep one, delete
 * the others and the switcher in QuoteList):
 * - price: the price itself turns yellow with an arrow and a caption
 * - note:  a yellow edge on the card and a sentence under the description
 * - meter: a three-step gauge under the price with the top step lit
 */
export type PriceStyle = "price" | "note" | "meter";

/** One line of the quote: what it is, what it costs, who should do it. */
export function QuoteCard({ item, priceStyle }: { item: QuoteItem; priceStyle: PriceStyle }) {
  const router = useRouter();
  const part = partById(item.relevantPart);
  const status = quoteStatus(item);
  const high = item.isHighPrice;

  return (
    <li
      className={`rounded-2xl bg-white/[0.09] p-4 ${
        high && priceStyle === "note" ? "border-l-2 border-pricey" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="mt-px w-5 shrink-0 text-sm tabular-nums text-white/45">{item.index}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-white/95">{item.description}</p>
            <div className="shrink-0 text-right">
              <p className={`text-sm font-medium tabular-nums ${high && priceStyle === "price" ? "text-pricey" : ""}`}>
                {high && priceStyle === "price" && <span aria-hidden>▲ </span>}
                {usd(item.amount)}
              </p>
              {high && priceStyle === "price" && <p className="mt-0.5 text-[11px] text-pricey">above average</p>}
              {high && priceStyle === "meter" && (
                <div className="mt-1.5">
                  <div className="flex justify-end gap-0.5" aria-hidden>
                    <span className="h-1 w-4 rounded-full bg-white/25" />
                    <span className="h-1 w-4 rounded-full bg-white/25" />
                    <span className="h-1 w-4 rounded-full bg-pricey" />
                  </div>
                  <p className="mt-1 text-[11px] text-pricey">above average</p>
                </div>
              )}
            </div>
          </div>
          {part && <p className="mt-0.5 text-xs text-white/50">{part.label}</p>}
          {high && priceStyle === "note" && (
            <p className="mt-1.5 text-xs text-pricey">
              <span aria-hidden>▲ </span>Priced above the average for this job
            </p>
          )}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS[status].className}`}>{STATUS[status].label}</span>
            {status === "diy" && part && (
              <button
                onClick={() => router.push(`/garage?part=${part.id}&guide=1`)}
                className="ml-auto min-h-11 rounded-full bg-white px-4 text-sm font-medium text-black transition active:scale-95"
              >
                View
              </button>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
