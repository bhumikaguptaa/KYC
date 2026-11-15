"use client";

import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode, type SVGProps } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, m, useDragControls, type PanInfo } from "motion/react";
import { PartGuide } from "@/components/guide/PartGuide";
import { glide, spring } from "@/components/ui/MotionProvider";
import { ModeSwitch } from "@/components/ui/ModeSwitch";
import {
  IconBack,
  IconClose,
  IconDoor,
  IconDrop,
  IconHatch,
  IconHood,
  IconLift,
  IconLights,
  IconRecenter,
  IconWarning,
  IconWipers,
  IconWrench,
  IconXray,
} from "@/components/ui/icons";
import { Effort, Lamp, STATUS, STATUS_ORDER } from "@/components/ui/status";
import { PARTS, partById, type Part, type PartStatus } from "@/lib/car";
import { GUIDES } from "@/lib/guides";
import { isPartId } from "@/lib/quote";
import { useScene } from "@/lib/scene-context";
import { markSeen, seen, tick, useWide } from "@/lib/ui";

/**
 * The garage keeps its view and selected part in the URL (/garage?view=bay&part=battery), so a
 * reload, a shared link or a relaunch of the installed app comes back to the same place.
 * guide=1 opens the part's how-to guide on its sheet (the quote's "Show me how" links here).
 */
type UrlState = { view: "garage" | "engineBay" | "part"; part: string | null; guide: boolean };

function readUrl(): UrlState {
  const q = new URLSearchParams(window.location.search);
  const part = partById(q.get("part"))?.id ?? null;
  if (part) return { view: "part", part, guide: q.get("guide") === "1" };
  return { view: q.get("view") === "bay" ? "engineBay" : "garage", part: null, guide: false };
}

const hasGuide = (id: string | null | undefined) => isPartId(id) && !!GUIDES[id];

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

export default function GaragePage() {
  const router = useRouter();
  const s = useScene();
  const { setView, select, toggle, setXray } = s;
  const wide = useWide();
  const underHood = s.view === "engineBay" || s.view === "part" || s.view === "explore";
  const exploring = s.view === "explore";
  const part = partById(s.selected);
  // The part sheet shows the how-to guide in place of the short text.
  const [guideOpen, setGuideOpen] = useState(false);
  const guide = guideOpen && hasGuide(part?.id) && !exploring;

  // On a phone the part sheet covers the lower half: lift the part above it (higher still for the
  // taller guide), so you can see what you're reading about.
  const { setFrameOffset } = s;
  const lift = !wide && s.view === "part" ? (guide ? 0.42 : 0.3) : null;
  useEffect(() => {
    setFrameOffset(lift === null ? null : [0, lift]);
  }, [lift, setFrameOffset]);
  useEffect(() => () => setFrameOffset(null), [setFrameOffset]);

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

  const goUnder = () => {
    s.setXray(false);
    s.toggle("hood", true);
    s.select(null);
    s.setView("engineBay");
  };
  const goOutside = () => {
    setGuideOpen(false);
    s.select(null);
    s.setView("garage");
  };
  const closePart = () => {
    setGuideOpen(false);
    s.select(null);
    s.setView("engineBay");
  };

  const sheet = part && (
    <PartSheet
      key={part.id}
      part={part}
      exploring={exploring}
      mobile={!wide}
      guide={guide}
      onGuide={hasGuide(part.id) ? setGuideOpen : undefined}
      // Came here from the quote: one tap back to the slip.
      onBackToQuote={s.quote?.some((i) => i.relevantPart === part.id) ? () => router.push("/quote") : undefined}
      onClose={closePart}
      onExplore={() => {
        tick();
        s.setView(exploring ? "part" : "explore");
      }}
      onRecenter={s.recenter}
    />
  );

  return (
    <div className="relative flex h-full flex-col">
      {/* Scrims: keep the controls legible over a bright car, without boxing the car in. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-ink/85 to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-ink via-ink/70 to-transparent" />

      <Header />
      <CoachHint underHood={underHood} />

      {/* Wide screens: the part sheet docks on the right, clear of the car and the controls. */}
      <div className="relative flex min-h-0 flex-1 justify-end px-6 py-4">
        <AnimatePresence mode="popLayout">{wide && sheet}</AnimatePresence>
      </div>

      <m.footer
        className="relative flex flex-col items-center gap-3 px-3 pb-3 sm:px-6 sm:pb-6"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...glide, delay: 0.1 }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {!wide && sheet ? (
            sheet
          ) : underHood ? (
            <PartsBrowser key="parts" exploring={exploring} onPick={() => setGuideOpen(false)} />
          ) : (
            <Dock key="dock" />
          )}
        </AnimatePresence>
        <ModeSwitch
          place={underHood ? "bay" : "outside"}
          quoteReady={s.quote !== null}
          onChange={(p) => {
            if (p === "quote") router.push("/quote");
            else if (p === "bay") goUnder();
            else goOutside();
          }}
        />
      </m.footer>
    </div>
  );
}

/* ───────────────────────────── Header ───────────────────────────── */

function Header() {
  const s = useScene();
  const v = s.vehicle;
  return (
    <m.header
      className="pointer-events-auto relative flex items-start justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-6"
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={glide}
    >
      <div className="flex min-w-0 items-start gap-3">
        <Link
          href="/"
          aria-label="Back to start"
          className="glass grid size-11 shrink-0 place-items-center rounded-full text-chalk/80 transition hover:text-chalk active:scale-90"
        >
          <IconBack width={20} height={20} />
        </Link>
        <div className="min-w-0 pt-0.5">
          <div className="gauge-label">{v ? `${v.year} · My garage` : "Demo car · My garage"}</div>
          <h1 className="mt-0.5 truncate text-[19px] font-semibold tracking-tight sm:text-2xl">
            {v ? `${v.make} ${v.model}` : "Honda Civic Type R"}
          </h1>
          {s.recalls.length > 0 && (
            <div className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-caution">
              <IconWarning width={14} height={14} style={{ filter: "drop-shadow(0 0 5px currentColor)" }} />
              {s.recalls.length} safety recall{s.recalls.length > 1 ? "s" : ""} on file
            </div>
          )}
        </div>
      </div>
      <button
        onClick={() => {
          tick();
          s.recenter();
        }}
        className="glass flex min-h-11 shrink-0 items-center gap-2 rounded-full px-3 text-sm text-chalk/80 transition hover:text-chalk active:scale-95 sm:px-4"
        aria-label="Reset view"
      >
        <IconRecenter width={19} height={19} />
        <span className="hidden sm:inline">Reset view</span>
      </button>
    </m.header>
  );
}

/* ─────────────────────────────── Dock ─────────────────────────────── */

/** Around the car: every switch you'd find on the car itself, each with a label (no guessing icons). */
function Dock() {
  const s = useScene();
  const doorsOpen = s.open.frontDoors || s.open.rearDoors;
  const items: { label: string; Icon: Icon; on: boolean; press: () => void }[] = [
    { label: "Hood", Icon: IconHood, on: s.open.hood, press: () => s.toggle("hood") },
    {
      label: "Doors",
      Icon: IconDoor,
      on: doorsOpen,
      press: () => {
        s.toggle("frontDoors", !doorsOpen);
        s.toggle("rearDoors", !doorsOpen);
      },
    },
    { label: "Hatch", Icon: IconHatch, on: s.open.hatch, press: () => s.toggle("hatch") },
    { label: "Lights", Icon: IconLights, on: s.lights, press: () => s.setLights(!s.lights) },
    { label: "Wipers", Icon: IconWipers, on: s.wipers, press: () => s.setWipers(!s.wipers) },
    { label: "X-ray", Icon: IconXray, on: s.xray, press: () => s.setXray(!s.xray) },
  ];
  return (
    <m.nav
      aria-label="Car controls"
      className="glass pointer-events-auto flex w-full max-w-[31rem] gap-1 rounded-[26px] p-1.5"
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.98 }}
      transition={spring}
    >
      {items.map(({ label, Icon, on, press }) => (
        <button
          key={label}
          aria-pressed={on}
          onClick={() => {
            tick();
            press();
          }}
          className={`relative flex min-h-[62px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[20px] transition-colors duration-200 active:scale-95 ${
            on ? "bg-white/[0.09] text-chalk" : "text-chalk/70 hover:bg-white/[0.04] hover:text-chalk"
          }`}
        >
          {/* The tell-tale: lit high-beam blue when this thing is on/open. */}
          <span
            aria-hidden
            className={`absolute right-2.5 top-2 size-1.5 rounded-full transition-all duration-300 ${on ? "lamp text-beam" : "bg-white/12"}`}
          />
          <Icon width={23} height={23} className={`transition-colors duration-200 ${on ? "text-beam" : ""}`} />
          <span className="text-[11.5px] font-medium tracking-tight">{label}</span>
        </button>
      ))}
    </m.nav>
  );
}

/* ─────────────────────────── Parts browser ─────────────────────────── */

/**
 * Under the hood: a key that doubles as a filter ("what can I do myself?"), then the parts as
 * cards, easiest first. Tapping one flies the camera to it.
 */
function PartsBrowser({ exploring, onPick }: { exploring: boolean; onPick: () => void }) {
  const s = useScene();
  const [filter, setFilter] = useState<PartStatus | null>(null);
  const counts = useMemo(
    () => Object.fromEntries(STATUS_ORDER.map((k) => [k, PARTS.filter((p) => p.status === k).length])) as Record<PartStatus, number>,
    [],
  );
  const parts = useMemo(
    () =>
      [...PARTS]
        .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))
        .filter((p) => !filter || p.status === filter),
    [filter],
  );

  return (
    <m.div
      className="pointer-events-auto w-full max-w-[52rem]"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={spring}
    >
      <div className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3 pb-2 sm:justify-center">
        <FilterChip active={!filter} onClick={() => setFilter(null)}>
          All parts <span className="text-chalk/40 tabular-nums">{PARTS.length}</span>
        </FilterChip>
        {STATUS_ORDER.map((k) => (
          <FilterChip key={k} active={filter === k} onClick={() => setFilter(filter === k ? null : k)}>
            <Lamp className={STATUS[k].lamp} size={7} />
            {STATUS[k].short} <span className="text-chalk/40 tabular-nums">{counts[k]}</span>
          </FilterChip>
        ))}
      </div>

      <div className="no-scrollbar fade-x -mx-3 flex snap-x snap-mandatory scroll-px-3 gap-2 overflow-x-auto px-3 pb-1">
        <AnimatePresence mode="popLayout" initial={false}>
          {parts.map((p) => (
            <PartCard
              key={p.id}
              part={p}
              selected={s.selected === p.id}
              onClick={() => {
                tick();
                onPick();
                s.select(p.id);
                // While exploring, a card swaps which part is out (if that part can come out).
                if (!exploring || !p.explorable) s.setView("part");
              }}
            />
          ))}
        </AnimatePresence>
      </div>
    </m.div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={() => {
        tick();
        onClick();
      }}
      aria-pressed={active}
      className={`flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium transition-colors ${
        active ? "border-white/20 bg-white/[0.12] text-chalk" : "border-white/[0.07] bg-[rgb(19_20_23/0.6)] text-chalk/65 backdrop-blur-md"
      }`}
    >
      {children}
    </button>
  );
}

function PartCard({ part, selected, onClick }: { part: Part; selected: boolean; onClick: () => void }) {
  const st = STATUS[part.status];
  return (
    <m.button
      layout
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={spring}
      onClick={onClick}
      aria-pressed={selected}
      className={`glass flex w-[9.5rem] shrink-0 snap-start flex-col self-stretch rounded-[20px] p-3 text-left transition-[border-color] ${
        selected ? "!border-beam/70" : ""
      }`}
    >
      <span className={`flex items-center gap-1.5 text-[11px] font-medium ${st.text}`}>
        <Lamp className={st.lamp} size={6} />
        {st.short}
        {part.explorable && (
          <span className="ml-auto text-chalk/40" title="You can take this part out and turn it around">
            <IconLift width={14} height={14} />
            <span className="sr-only">Can take out</span>
          </span>
        )}
      </span>
      <span className="mt-1.5 line-clamp-2 text-[14px] font-medium leading-tight text-chalk">{part.label}</span>
    </m.button>
  );
}

/* ───────────────────────────── Part sheet ───────────────────────────── */

function PartSheet({
  part,
  exploring,
  mobile,
  guide,
  onGuide,
  onBackToQuote,
  onClose,
  onExplore,
  onRecenter,
}: {
  part: Part;
  exploring: boolean;
  mobile: boolean;
  /** showing the how-to guide instead of the short text */
  guide: boolean;
  /** present when this part has a guide */
  onGuide?: (open: boolean) => void;
  onBackToQuote?: () => void;
  onClose: () => void;
  onExplore: () => void;
  onRecenter: () => void;
}) {
  const st = STATUS[part.status];
  const drag = useDragControls();
  const body = useRef<HTMLDivElement>(null);

  // Phones: pull the sheet down to close it, like any native sheet.
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 90 || info.velocity.y > 600) onClose();
  };

  // A guide is read top to bottom: start it at the top.
  useEffect(() => {
    body.current?.scrollTo({ top: 0 });
  }, [guide]);

  return (
    <m.section
      aria-label={part.label}
      className={`glass pointer-events-auto relative flex flex-col overflow-hidden ${
        mobile
          ? `${guide ? "max-h-[min(66svh,42rem)]" : "max-h-[min(52vh,30rem)]"} w-full max-w-[34rem] rounded-[28px] transition-[max-height] duration-500`
          : `max-h-full ${guide ? "w-[25rem]" : "w-[22rem]"} self-start rounded-[28px] transition-[width] duration-500`
      }`}
      initial={mobile ? { opacity: 0, y: 60 } : { opacity: 0, x: 40, scale: 0.98 }}
      animate={mobile ? { opacity: 1, y: 0 } : { opacity: 1, x: 0, scale: 1 }}
      exit={mobile ? { opacity: 0, y: 60 } : { opacity: 0, x: 40, scale: 0.98 }}
      transition={glide}
      drag={mobile ? "y" : false}
      dragListener={false}
      dragControls={drag}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.04, bottom: 0.7 }}
      onDragEnd={onDragEnd}
    >
      {/* Status-coloured wash along the top edge: the part's tell-tale, at a glance. */}
      <div aria-hidden className={`pointer-events-none absolute inset-x-0 top-0 h-24 opacity-[0.16] ${st.text}`}>
        <div className="size-full" style={{ background: "radial-gradient(120% 100% at 20% 0%, currentColor, transparent 70%)" }} />
      </div>

      <div className="relative touch-none px-5 pt-2.5" onPointerDown={(e) => mobile && drag.start(e)}>
        {mobile && <div aria-hidden className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/20" />}
        <div className="flex items-start justify-between gap-3 pt-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {onBackToQuote && (
              <button
                onClick={onBackToQuote}
                onPointerDown={(e) => e.stopPropagation()}
                className="-my-1 -ml-1 flex min-h-10 items-center gap-1.5 rounded-full bg-white/[0.07] pl-2 pr-3 text-xs font-medium text-chalk/80 transition active:scale-95"
              >
                <IconBack width={15} height={15} />
                Your quote
              </button>
            )}
            <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${st.bg} ${st.text}`}>
              <Lamp className={st.lamp} size={6} />
              {st.label}
            </span>
          </div>
          {/* The installed app has no browser back button, so every panel closes itself. */}
          <button
            onClick={onClose}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Close part details"
            className="-mr-2 grid size-10 shrink-0 place-items-center rounded-full bg-white/[0.06] text-chalk/70 transition hover:text-chalk active:scale-90"
          >
            <IconClose width={18} height={18} />
          </button>
        </div>
        <h2 className="mt-2 text-[22px] font-semibold leading-tight tracking-tight">{part.label}</h2>

        {/* Parts with a how-to get two pages: what it is, and how to do the job. */}
        {onGuide && !exploring && (
          <div
            role="tablist"
            aria-label="Part details"
            className="relative mt-3 flex rounded-full bg-white/[0.06] p-1"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {[
              { on: false, label: "About" },
              { on: true, label: "How to do it" },
            ].map((t) => {
              const active = t.on === guide;
              return (
                <button
                  key={t.label}
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    if (active) return;
                    tick();
                    onGuide(t.on);
                  }}
                  className="relative min-h-10 flex-1 rounded-full text-[14px] font-medium"
                >
                  {active && (
                    <m.span layoutId={`sheet-tab-${part.id}`} className="absolute inset-0 rounded-full bg-white/[0.14]" transition={spring} />
                  )}
                  <span className={`relative transition-colors ${active ? "text-chalk" : "text-chalk/55"}`}>{t.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div ref={body} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">
        <AnimatePresence mode="wait" initial={false}>
          {exploring ? (
            <m.div key="facts" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={spring}>
              {part.facts && (
                // Phones: a row of cards you swipe sideways, so the sheet stays short and the part
                // stays visible. Wider screens: a plain list.
                <dl
                  className={
                    mobile
                      ? "no-scrollbar -mx-5 mt-3 flex snap-x snap-mandatory scroll-px-5 gap-2 overflow-x-auto px-5"
                      : "mt-3 divide-y divide-white/[0.07]"
                  }
                >
                  {part.facts.map((f) => (
                    <div key={f.label} className={mobile ? "w-60 shrink-0 snap-start rounded-2xl bg-white/[0.05] p-3.5" : "py-3"}>
                      <dt className="gauge-label">{f.label}</dt>
                      <dd className="mt-1 text-[14px] leading-snug text-chalk/90">{f.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </m.div>
          ) : guide ? (
            <m.div key="guide" className="pt-4" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={spring}>
              <PartGuide partId={part.id} compact={mobile} />
            </m.div>
          ) : (
            <m.div
              key="about"
              initial={onGuide ? { opacity: 0, x: -16 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={onGuide ? { opacity: 0, x: -16 } : { opacity: 0, y: -8 }}
              transition={spring}
            >
              <p className={`${onGuide ? "mt-3" : "mt-1.5"} text-[15px] leading-snug text-chalk/70`}>{part.about}</p>
              <div className={`mt-4 rounded-2xl border-l-2 bg-white/[0.04] px-4 py-3 ${st.text} border-current`}>
                <div className="gauge-label" style={{ color: "currentColor" }}>
                  Can I do it?
                </div>
                <p className="mt-1 text-[14px] leading-snug text-chalk/90">{part.reason}</p>
              </div>
              <div className="mt-4">
                <Effort status={part.status} />
              </div>
            </m.div>
          )}
        </AnimatePresence>

        {!guide && (
          <div className="mt-5 flex gap-2">
            {onGuide && !exploring && (
              <button
                onClick={() => {
                  tick();
                  onGuide(true);
                }}
                className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold transition active:scale-[0.98] ${
                  part.explorable ? "bg-white/[0.08] text-chalk" : "bg-chalk text-ink"
                }`}
              >
                <IconWrench width={18} height={18} />
                Show me how
              </button>
            )}
            {part.explorable && (
              <button
                onClick={onExplore}
                className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-chalk text-[15px] font-semibold text-ink transition active:scale-[0.98]"
              >
                {exploring ? <IconDrop width={19} height={19} /> : <IconLift width={19} height={19} />}
                {exploring ? "Put it back" : "Take it out"}
              </button>
            )}
            {exploring && (
              <button
                onClick={onRecenter}
                aria-label="Recenter the part"
                className="grid min-h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/[0.07] text-chalk/80 transition active:scale-95"
              >
                <IconRecenter width={19} height={19} />
              </button>
            )}
          </div>
        )}
        {exploring && (
          <p className="mt-3 text-center text-xs text-chalk/40">
            {mobile ? "One finger turns it · pinch to zoom" : "Drag to turn · scroll to zoom · right-drag to move"}
          </p>
        )}
      </div>
    </m.section>
  );
}

/* ───────────────────────────── Coach hint ───────────────────────────── */

/** A one-time nudge per mode, for people who've never touched a 3D model. Fades by itself. */
function CoachHint({ underHood }: { underHood: boolean }) {
  const key = underHood ? "kyc:hint-bay" : "kyc:hint-outside";
  const [shown, setShown] = useState<string | null>(null);

  useEffect(() => {
    if (seen(key)) return;
    const show = setTimeout(() => setShown(key), 1400);
    const hide = setTimeout(() => {
      setShown(null);
      markSeen(key);
    }, 7400);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [key]);

  const text = underHood ? "Each light is a part. Green ones you can do yourself." : "Drag to turn the car. Tap a label to open it.";
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[5.5rem] flex justify-center px-4 sm:top-24">
      <AnimatePresence>
        {shown === key && (
          <m.button
            key={key}
            onClick={() => {
              setShown(null);
              markSeen(key);
            }}
            className="glass pointer-events-auto flex items-center gap-2.5 rounded-full py-2 pl-2.5 pr-4 text-[13px] text-chalk/85"
            initial={{ opacity: 0, y: -10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={spring}
          >
            <Lamp className={underHood ? "text-go" : "text-beam"} size={7} />
            {text}
          </m.button>
        )}
      </AnimatePresence>
    </div>
  );
}
