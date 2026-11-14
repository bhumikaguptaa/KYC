"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { PartGuide } from "@/components/guide/PartGuide";
import { spring } from "@/components/ui/MotionProvider";
import { PARTS, partById, type PartStatus } from "@/lib/car";
import { GUIDES } from "@/lib/guides";
import { isPartId } from "@/lib/quote";
import { useScene } from "@/lib/scene-context";

const STATUS: Record<PartStatus, { label: string; className: string }> = {
  diy: { label: "Do it yourself", className: "bg-diy/15 text-diy" },
  advanced: { label: "Advanced DIY", className: "bg-advanced/15 text-advanced" },
  shop: { label: "Mechanic only", className: "bg-shop/15 text-shop" },
};

/**
 * The garage keeps its view and selected part in the URL (/garage?view=bay&part=battery), so a
 * reload, a shared link or a relaunch of the installed app comes back to the same place.
 * guide=1 opens the part's how-to guide on its sheet (the quote's View button links here).
 */
type UrlState = { view: "garage" | "engineBay" | "part"; part: string | null; guide: boolean };

function readUrl(): UrlState {
  const q = new URLSearchParams(window.location.search);
  const part = partById(q.get("part"))?.id ?? null;
  if (part) return { view: "part", part, guide: q.get("guide") === "1" };
  return { view: q.get("view") === "bay" ? "engineBay" : "garage", part: null, guide: false };
}

const hasGuide = (id: string | null | undefined) => isPartId(id) && !!GUIDES[id];

export default function GaragePage() {
  const router = useRouter();
  const s = useScene();
  const { setView, select } = s;
  const underHood = s.view === "engineBay" || s.view === "part" || s.view === "explore";
  const exploring = s.view === "explore";
  const part = partById(s.selected);
  // The how-to guide shows on the part sheet in place of the short text.
  const [guideOpen, setGuideOpen] = useState(false);
  const guide = guideOpen && hasGuide(part?.id);

  const { toggle, setXray } = s;

  // On arrival, restore the view from the URL. Read once: the ref survives React's dev double-run.
  const fromUrl = useRef<UrlState | null>(null);
  useEffect(() => {
    fromUrl.current ??= readUrl();
    const { view, part: id, guide: withGuide } = fromUrl.current;
    if (view !== "garage") {
      setXray(false);
      toggle("hood", true);
    }
    select(id);
    setView(view);
    setGuideOpen(withGuide);
  }, [setView, select, toggle, setXray]);

  // Afterwards, keep the URL in step with the view. replaceState, not push: no history pile-up.
  useEffect(() => {
    if (s.view === "start") return; // still showing the previous page's state
    const q = new URLSearchParams();
    if (s.view !== "garage") q.set("view", "bay");
    if ((s.view === "part" || s.view === "explore") && s.selected) q.set("part", s.selected);
    if (s.view === "part" && guide) q.set("guide", "1");
    const url = q.size ? `/garage?${q}` : "/garage";
    if (url !== window.location.pathname + window.location.search) window.history.replaceState(null, "", url);
  }, [s.view, s.selected, guide]);

  const enterBay = () => {
    s.setXray(false);
    s.toggle("hood", true);
    s.select(null);
    s.setView("engineBay");
  };
  const leaveBay = () => {
    setGuideOpen(false);
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
        <div className="flex shrink-0 gap-2">
          <Link
            href="/quote"
            className="glass flex min-h-11 items-center rounded-full px-4 text-sm text-white/75 transition active:scale-95"
          >
            Quote
          </Link>
          {underHood ? (
            <Pill onClick={leaveBay}>Exit engine bay</Pill>
          ) : (
            <Pill onClick={() => s.setXray(!s.xray)} active={s.xray}>
              X-ray
            </Pill>
          )}
        </div>
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
            {/* Came here from a quote's View button: one tap back to the list. */}
            {guide && s.quote && (
              <button
                onClick={() => router.push("/quote")}
                className="-mt-2 mb-2 -ml-1 min-h-11 pl-1 pr-4 text-xs font-medium tracking-[0.2em] text-white/50"
              >
                ← BACK TO QUOTE
              </button>
            )}
            <div className="flex items-start justify-between gap-3">
              {/* Exploring on a phone: badge beside the title, to keep the sheet short. */}
              <div className={exploring ? "flex flex-row-reverse items-center justify-end gap-3 sm:block" : ""}>
                <span
                  className={`inline-block shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS[part.status].className}`}
                >
                  {STATUS[part.status].label}
                </span>
                <h2 className={`text-lg font-semibold ${exploring ? "sm:mt-3" : "mt-3"}`}>{part.label}</h2>
              </div>
              {/* The installed app has no browser back button, so every panel closes itself. */}
              <button
                onClick={() => {
                  setGuideOpen(false);
                  s.select(null);
                  s.setView("engineBay");
                }}
                aria-label="Close part details"
                className="-m-3 grid size-11 shrink-0 place-items-center text-white/50 transition active:scale-90"
              >
                ✕
              </button>
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
            ) : guide ? (
              <PartGuide partId={part.id} />
            ) : (
              <>
                <p className="mt-1 text-sm text-white/65">{part.about}</p>
                <p className="mt-3 text-sm text-white/90">{part.reason}</p>
                {hasGuide(part.id) && (
                  <button
                    onClick={() => setGuideOpen(true)}
                    className="mt-4 min-h-11 w-full rounded-xl bg-white/10 text-sm font-medium text-white/90 transition active:scale-[0.98]"
                  >
                    How to do it
                  </button>
                )}
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
                    setGuideOpen(false);
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
              <Pill onClick={() => s.setWipers(!s.wipers)} active={s.wipers}>
                Wipers
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
