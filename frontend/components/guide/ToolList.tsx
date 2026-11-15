"use client";

import { useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { IconPin } from "@/components/ui/icons";
import { spring } from "@/components/ui/MotionProvider";
import { storesForTool, type Store } from "@/lib/stores";
import { tick } from "@/lib/ui";

/**
 * The tools and supplies a guide asks for. Each one has a "Find tool" button that opens, right
 * under it, the places that offer it. One list is open at a time, so the guide stays short.
 */
export function ToolList({ tools }: { tools: string[] }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <ul className="mt-1.5 text-[14px] leading-snug text-chalk/85">
      {tools.map((tool, i) => {
        const isOpen = open === tool;
        const listId = `tool-stores-${i}`;
        return (
          <li key={tool}>
            <div className="flex items-center gap-2 py-1">
              <span aria-hidden className="size-1 shrink-0 rounded-full bg-chalk/40" />
              <span className="min-w-0 flex-1">{tool}</span>
              <button
                onClick={() => {
                  tick();
                  setOpen(isOpen ? null : tool);
                }}
                aria-expanded={isOpen}
                aria-controls={listId}
                aria-label={`${isOpen ? "Hide places for" : "Find tool:"} ${tool}`}
                // 36px tall, in rows 44px apart: each button has a full finger-sized row to itself.
                className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium transition active:scale-95 ${
                  isOpen ? "bg-chalk text-ink" : "bg-white/[0.08] text-chalk/85"
                }`}
              >
                <IconPin width={14} height={14} />
                {isOpen ? "Hide" : "Find tool"}
              </button>
            </div>

            <AnimatePresence initial={false}>
              {isOpen && (
                <m.div
                  id={listId}
                  key="stores"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={spring}
                >
                  <p className="gauge-label mt-2">Where to get it</p>
                  <ul className="mt-2 mb-3 space-y-2">
                    {storesForTool(tool).map((store) => (
                      <StoreCard key={store.id} store={store} />
                    ))}
                  </ul>
                </m.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}

/** One place that offers the tool. A sponsored place carries a pill in its top right corner. */
function StoreCard({ store }: { store: Store }) {
  return (
    <li
      className={`relative rounded-2xl p-3.5 ${
        store.sponsored ? "bg-white/[0.07] ring-1 ring-inset ring-white/10" : "bg-white/[0.05]"
      }`}
    >
      {store.sponsored && (
        <span className="absolute right-3 top-3 rounded-full bg-pricey/15 px-2 py-0.5 text-[11px] font-medium text-pricey">
          Sponsored
        </span>
      )}
      {/* Room on the right so a long name never runs under the pill. */}
      <p className={`text-[15px] font-medium text-chalk ${store.sponsored ? "pr-24" : ""}`}>{store.name}</p>
      <p className="mt-0.5 text-[12.5px] text-chalk/55">{store.kind}</p>
      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-chalk/80">
        <span className="flex items-center gap-1 tabular-nums">
          <IconPin width={13} height={13} />
          {store.distance}
        </span>
        <span aria-hidden className="text-chalk/30">
          ·
        </span>
        <span>{store.address}</span>
      </p>
      <p className="mt-0.5 text-[13px] text-chalk/55">{store.hours}</p>
      <p className="mt-2 text-[13px] text-go">{store.offer}</p>
    </li>
  );
}
