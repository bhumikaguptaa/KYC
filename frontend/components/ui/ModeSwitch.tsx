"use client";

import type { ComponentType, SVGProps } from "react";
import { m } from "motion/react";
import { spring } from "./MotionProvider";
import { IconCar, IconReceipt, IconWrench } from "./icons";
import { tick } from "@/lib/ui";

export type Place = "outside" | "bay" | "quote";

const PLACES: { place: Place; label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { place: "outside", label: "Outside", Icon: IconCar },
  { place: "bay", label: "Under the hood", Icon: IconWrench },
  { place: "quote", label: "Quote", Icon: IconReceipt },
];

/**
 * The three places in the product, always in the same spot at the bottom: around the car, in the
 * engine bay, and your repair quote. A sliding pill marks where you are. `quoteReady` lights a
 * lamp on the Quote tab when a quote has been read.
 */
export function ModeSwitch({ place, onChange, quoteReady }: { place: Place; onChange: (p: Place) => void; quoteReady?: boolean }) {
  return (
    <div role="tablist" aria-label="Where to look" className="glass pointer-events-auto relative flex w-full max-w-[27rem] rounded-full p-1">
      {PLACES.map(({ place: p, label, Icon }) => {
        const active = p === place;
        return (
          <button
            key={p}
            role="tab"
            aria-selected={active}
            onClick={() => {
              if (active) return;
              tick();
              onChange(p);
            }}
            className="relative flex min-h-12 flex-auto items-center justify-center rounded-full px-3 text-[14px] font-medium sm:text-[15px]"
          >
            {active && <m.span layoutId="mode-pill" className="absolute inset-0 rounded-full bg-chalk" transition={spring} />}
            <span className={`relative flex items-center gap-1.5 whitespace-nowrap transition-colors duration-200 ${active ? "text-ink" : "text-chalk/65"}`}>
              <Icon width={18} height={18} />
              {label}
              {p === "quote" && quoteReady && !active && <span aria-label="(quote read)" className="lamp ml-0.5 size-1.5 rounded-full text-beam" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
