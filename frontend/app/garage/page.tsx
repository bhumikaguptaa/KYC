"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, m } from "motion/react";
import { spring } from "@/components/ui/MotionProvider";
import { PARTS, partById, type PartStatus } from "@/lib/car";
import { useScene } from "@/lib/scene-context";

const STATUS: Record<PartStatus, { label: string; className: string }> = {
  diy: { label: "Do it yourself", className: "bg-diy/15 text-diy" },
  advanced: { label: "Advanced DIY", className: "bg-advanced/15 text-advanced" },
  shop: { label: "Mechanic only", className: "bg-shop/15 text-shop" },
};

export default function GaragePage() {
  const s = useScene();
  const { setView, select } = s;
  const underHood = s.view === "engineBay" || s.view === "part" || s.view === "explore";
  const exploring = s.view === "explore";
  const part = partById(s.selected);

  useEffect(() => {
    setView("garage");
    select(null);
  }, [setView, select]);

  const enterBay = () => {
    s.setXray(false);
    s.toggle("hood", true);
    s.select(null);
    s.setView("engineBay");
  };
  const leaveBay = () => {
    s.select(null);
    s.setView("garage");
  };

  const title = s.vehicle ? `${s.vehicle.year} ${s.vehicle.make} ${s.vehicle.model}` : "Honda Civic Type R";

  return (
    <div className="flex h-full flex-col justify-between p-4 sm:p-6">
      {/* Top bar */}
      <m.header
        className="pointer-events-auto flex items-start justify-between gap-3"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
      >
        <div>
          <Link href="/" className="text-xs font-medium tracking-[0.3em] text-white/45">
            ← KYC
          </Link>
          <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
          {s.recalls.length > 0 && (
            <p className="mt-1 text-xs text-advanced">
              {s.recalls.length} recall{s.recalls.length > 1 ? "s" : ""} on file
            </p>
          )}
        </div>
        {underHood ? (
          <Pill onClick={leaveBay}>Exit engine bay</Pill>
        ) : (
          <Pill onClick={() => s.setXray(!s.xray)} active={s.xray}>
            X-ray
          </Pill>
        )}
      </m.header>

      {/* Part sheet */}
      <AnimatePresence>
        {part && (
          <m.section
            key={part.id}
            className="glass pointer-events-auto absolute inset-x-4 bottom-28 rounded-3xl p-5 sm:inset-x-auto sm:right-6 sm:top-24 sm:bottom-auto sm:w-80"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={spring}
          >
            {/* Exploring on a phone: badge beside the title, to keep the sheet short. */}
            <div className={exploring ? "flex flex-row-reverse items-center justify-end gap-3 sm:block" : ""}>
              <span
                className={`inline-block shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS[part.status].className}`}
              >
                {STATUS[part.status].label}
              </span>
              <h2 className={`text-lg font-semibold ${exploring ? "sm:mt-3" : "mt-3"}`}>{part.label}</h2>
            </div>
            {exploring ? (
              <>
                {part.facts && (
                  // Phones: a row of cards you swipe sideways, so the sheet stays short and the part
                  // stays visible. Desktop: a plain list.
                  <dl className="no-scrollbar -mx-5 mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto px-5 text-sm sm:mx-0 sm:block sm:space-y-2.5 sm:overflow-visible sm:px-0">
                    {part.facts.map((f) => (
                      <div key={f.label} className="w-60 shrink-0 snap-start rounded-xl bg-white/5 p-3 sm:w-auto sm:bg-transparent sm:p-0">
                        <dt className="text-xs text-white/45">{f.label}</dt>
                        <dd className="mt-0.5 text-white/90">{f.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                <button
                  onClick={s.recenter}
                  className="mt-4 w-full rounded-xl bg-white/5 py-2 text-sm text-white/75 transition active:scale-[0.98]"
                >
                  Recenter
                </button>
              </>
            ) : (
              <>
                <p className="mt-1 text-sm text-white/65">{part.about}</p>
                <p className="mt-3 text-sm text-white/90">{part.reason}</p>
              </>
            )}
            {part.explorable && (
              <button
                onClick={() => s.setView(exploring ? "part" : "explore")}
                className="mt-3 w-full rounded-xl bg-white py-2.5 text-sm font-medium text-black transition active:scale-[0.98]"
              >
                {exploring ? "Put it back" : "Take it out"}
              </button>
            )}
            {exploring && (
              <p className="mt-2.5 hidden text-center text-xs text-white/40 sm:block">
                Drag to turn · pinch or scroll to zoom · two fingers or right-drag to move
              </p>
            )}
          </m.section>
        )}
      </AnimatePresence>

      {/* Bottom controls */}
      <m.footer
        className="pointer-events-auto"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.08 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {underHood ? (
            <m.div
              key="parts"
              className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={spring}
            >
              {PARTS.map((p) => (
                <Pill
                  key={p.id}
                  active={s.selected === p.id}
                  dot={p.status}
                  onClick={() => {
                    s.select(p.id);
                    // While exploring, a chip swaps which part is out (if that part can come out).
                    if (!exploring || !p.explorable) s.setView("part");
                  }}
                >
                  {p.label}
                </Pill>
              ))}
            </m.div>
          ) : (
            <m.div
              key="controls"
              className="flex flex-wrap items-center gap-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={spring}
            >
              <Pill onClick={() => s.toggle("hood")} active={s.open.hood}>
                Hood
              </Pill>
              <Pill onClick={() => s.toggle("frontDoors")} active={s.open.frontDoors}>
                Front doors
              </Pill>
              <Pill onClick={() => s.toggle("rearDoors")} active={s.open.rearDoors}>
                Rear doors
              </Pill>
              <Pill onClick={() => s.toggle("hatch")} active={s.open.hatch}>
                Hatch
              </Pill>
              <Pill onClick={() => s.setLights(!s.lights)} active={s.lights}>
                Lights
              </Pill>
              <Pill onClick={() => s.setWipers(!s.wipers)} active={s.wipers}>
                Wipers
              </Pill>
              <button
                onClick={enterBay}
                className="ml-auto rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition active:scale-95"
              >
                Under the hood
              </button>
            </m.div>
          )}
        </AnimatePresence>
      </m.footer>
    </div>
  );
}

function Pill({
  children,
  onClick,
  active,
  dot,
}: {
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
  dot?: PartStatus;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`glass flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm transition active:scale-95 ${
        active ? "border-accent/60 text-white" : "text-white/75"
      }`}
    >
      {dot && (
        <span
          className={`size-1.5 rounded-full ${dot === "diy" ? "bg-diy" : dot === "shop" ? "bg-shop" : "bg-advanced"}`}
        />
      )}
      {children}
    </button>
  );
}
