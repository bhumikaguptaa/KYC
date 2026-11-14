"use client";

import { useRouter } from "next/navigation";
import { partById } from "@/lib/car";
import type { QuoteItem } from "@/lib/quote";

export const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

/** One line of the quote: what it is, what it costs, and whether you can do it yourself. */
export function QuoteCard({ item }: { item: QuoteItem }) {
  const router = useRouter();
  const part = partById(item.relevantPart);
  // The server only sets canDIY for a matched "diy" part, but the View link needs a part either way.
  const diy = item.canDIY && part;

  return (
    <li className="rounded-2xl bg-white/[0.04] p-4">
      <div className="flex items-start gap-3">
        <span className="mt-px w-5 shrink-0 text-sm tabular-nums text-white/35">{item.index}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-white/90">{item.description}</p>
            <p className="shrink-0 text-sm font-medium tabular-nums">{usd(item.amount)}</p>
          </div>
          {part && <p className="mt-0.5 text-xs text-white/40">{part.label}</p>}
          {(item.isHighPrice || diy) && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {item.isHighPrice && <span className="rounded-full bg-shop/15 px-2.5 py-1 text-xs font-medium text-shop">High price</span>}
              {diy && (
                <>
                  <span className="rounded-full bg-diy/15 px-2.5 py-1 text-xs font-medium text-diy">Do it yourself</span>
                  <button
                    onClick={() => router.push(`/garage?part=${part.id}&guide=1`)}
                    className="ml-auto min-h-11 rounded-full bg-white px-4 text-sm font-medium text-black transition active:scale-95"
                  >
                    View
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
