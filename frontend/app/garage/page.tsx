"use client";

import { useEffect, useRef, type ReactNode } from "react";
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

/**
 * The garage keeps its view and selected part in the URL (/garage?view=bay&part=battery), so a
 * reload, a shared link or a relaunch of the installed app comes back to the same place.
 */
type UrlState = { view: "garage" | "engineBay" | "part"; part: string | null };

function readUrl(): UrlState {
  const q = new URLSearchParams(window.location.search);
  const part = partById(q.get("part"))?.id ?? null;
  if (part) return { view: "part", part };
  return { view: q.get("view") === "bay" ? "engineBay" : "garage", part: null };
}

export default function GaragePage() {
  const s = useScene();
  const { setView, select } = s;
  const underHood = s.view === "engineBay" || s.view === "part";
  const part = partById(s.selected);

  const { toggle, setXray } = s;

  // On arrival, restore the view from the URL. Read once: the ref survives React's dev double-run.
  const fromUrl = useRef<UrlState | null>(null);
  useEffect(() => {
    fromUrl.current ??= readUrl();
    const { view, part: id } = fromUrl.current;
    if (view !== "garage") {
      setXray(false);
      toggle("hood", true);
    }
    select(id);
    setView(view);
  }, [setView, select, toggle, setXray]);

  // Afterwards, keep the URL in step with the view. replaceState, not push: no history pile-up.
  useEffect(() => {
    if (s.view === "start") return; // still showing the previous page's state
    const q = new URLSearchParams();
    if (s.view !== "garage") q.set("view", "bay");
    if (s.view === "part" && s.selected) q.set("part", s.selected);
    const url = q.size ? `/garage?${q}` : "/garage";
    if (url !== window.location.pathname + window.location.search) window.history.replaceState(null, "", url);
  }, [s.view, s.selected]);

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
    <div className="flex h-full flex-col p-4 sm:p-6">
      {/* Top bar */}
      <m.header
        className="pointer-events-auto flex items-start justify-between gap-3"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
      >
        <div>
          <Link href="/" className="-my-3 inline-block py-3 pr-4 text-xs font-medium tracking-[0.3em] text-white/45">
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

      {/* Part sheet: sits between header and controls on phones, so it never covers the buttons */}
      <div className="flex min-h-0 flex-1 items-end py-3 sm:items-start sm:justify-end sm:py-4">
      <AnimatePresence>
        {part && (
          <m.section
            key={part.id}
            className="glass pointer-events-auto max-h-full w-full overflow-y-auto overscroll-contain rounded-3xl p-5 sm:w-80"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={spring}
          >
            <div className="flex items-start justify-between gap-3">
              <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${STATUS[part.status].className}`}>
                {STATUS[part.status].label}
              </span>
              {/* The installed app has no browser back button, so every panel closes itself. */}
              <button
                onClick={() => {
                  s.select(null);
                  s.setView("engineBay");
                }}
                aria-label="Close part details"
                className="-m-3 grid size-11 shrink-0 place-items-center text-white/50 transition active:scale-90"
              >
                ✕
              </button>
            </div>
            <h2 className="mt-3 text-lg font-semibold">{part.label}</h2>
            <p className="mt-1 text-sm text-white/65">{part.about}</p>
            <p className="mt-3 text-sm text-white/90">{part.reason}</p>
          </m.section>
        )}
      </AnimatePresence>
      </div>

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
                    s.setView("part");
                  }}
                >
                  {p.label}
                </Pill>
              ))}
            </m.div>
          ) : (
            <m.div
              key="controls"
              className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
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
              <button
                onClick={enterBay}
                className="order-first min-h-11 shrink-0 rounded-full bg-white px-5 text-sm font-medium text-black transition active:scale-95 sm:order-last sm:ml-auto"
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
      className={`glass flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm transition active:scale-95 ${
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
