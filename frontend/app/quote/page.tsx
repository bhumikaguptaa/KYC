"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { QuoteSlip } from "@/components/quote/QuoteSlip";
import { QuoteUpload } from "@/components/quote/QuoteUpload";
import { glide, spring } from "@/components/ui/MotionProvider";
import { ModeSwitch } from "@/components/ui/ModeSwitch";
import { IconBack, IconReceipt } from "@/components/ui/icons";
import { Lamp } from "@/components/ui/status";
import { QUOTE_FIXTURE } from "@/lib/quote-fixture";
import { useScene, type Glow } from "@/lib/scene-context";
import { tick, useWide } from "@/lib/ui";

/**
 * Check a repair quote. Before a quote: the car waits outside and the page asks for the PDF.
 * Once it's read, the hood opens, every quoted part lights up (green: do it yourself, red: the
 * shop's job) and the quote comes back as a marked-up paper slip. Tapping a line flies to its part.
 */
export default function QuotePage() {
  const router = useRouter();
  const wide = useWide();
  const s = useScene();
  const { quote, setQuote, setGlows, setView, select, setXray, toggle, setFrameOffset } = s;
  const hasQuote = quote !== null;
  const v = s.vehicle;

  // With a quote, open the hood and show the bay, so the quoted parts can glow in 3D.
  useEffect(() => {
    select(null);
    setXray(false);
    if (hasQuote) toggle("hood", true);
    setView(hasQuote ? "engineBay" : "garage");
  }, [hasQuote, select, setXray, toggle, setView]);

  // Glow each quoted part: green when you can do the job yourself, red otherwise. A new quote
  // replaces the glows; leaving the page clears them.
  useEffect(() => {
    if (!quote) return;
    const glows: Record<string, Glow> = {};
    for (const item of quote) {
      if (!item.relevantPart) continue;
      if (item.canDIY) glows[item.relevantPart] = "diy";
      else glows[item.relevantPart] ??= "shop";
    }
    setGlows(glows);
    return () => setGlows({});
  }, [quote, setGlows]);

  // Slide the car clear of the slip: to the right of it on wide screens, above it on phones.
  useEffect(() => {
    const frames = {
      garage: wide ? [-1.15, 0] : [0, 1.25],
      engineBay: wide ? [-0.42, 0] : [0, 0.8],
      part: wide ? [-0.22, 0] : [0, 0.4],
    } as const;
    const f = frames[s.view as keyof typeof frames];
    setFrameOffset(f ? [f[0], f[1]] : null);
  }, [wide, s.view, setFrameOffset]);
  useEffect(() => () => setFrameOffset(null), [setFrameOffset]);

  const pick = (part: string | null) => {
    select(part);
    setView(part ? "part" : "engineBay");
  };
  const vehicleLine = v ? `${v.year} ${v.make} ${v.model}` : null;
  const picked = hasQuote && !!s.selected;

  return (
    <div className="relative flex h-full flex-col">
      {/* Scrims: under the slip, and behind the header. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-ink/85 to-transparent" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t from-ink via-ink/75 to-transparent sm:inset-y-0 sm:left-0 sm:h-auto sm:w-[46%] sm:bg-gradient-to-r sm:via-ink/60"
      />

      <m.header
        className="pointer-events-auto relative flex items-start gap-3 px-4 pt-4 sm:px-6 sm:pt-6"
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={glide}
      >
        <Link
          href="/"
          aria-label="Back to start"
          className="glass grid size-11 shrink-0 place-items-center rounded-full text-chalk/80 transition hover:text-chalk active:scale-90"
        >
          <IconBack width={20} height={20} />
        </Link>
        <div className="min-w-0 pt-0.5">
          <div className="gauge-label">Repair quote{v ? ` · ${v.year}` : ""}</div>
          <h1 className="mt-0.5 truncate text-[19px] font-semibold tracking-tight sm:text-2xl">
            {v ? `${v.make} ${v.model}` : "Check a quote"}
          </h1>
        </div>
      </m.header>

      <div className="relative flex min-h-0 flex-1 flex-col justify-end px-3 pt-3 sm:justify-start sm:px-6 sm:pt-5">
        <AnimatePresence mode="wait" initial={false}>
          {!hasQuote ? (
            <m.section
              key="ask"
              aria-label="Upload a repair quote"
              className="glass pointer-events-auto mx-auto w-full max-w-[34rem] overflow-y-auto overscroll-contain rounded-[28px] p-5 sm:mx-0 sm:w-[27rem] sm:p-6"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12, filter: "blur(6px)", transition: { duration: 0.25 } }}
              transition={glide}
            >
              <div className="flex items-center gap-2.5">
                <Lamp className="text-caution" size={7} />
                <span className="gauge-label">Before you say yes</span>
              </div>
              <h2 className="mt-3 text-[28px] font-semibold leading-[1.02] tracking-[-0.03em] sm:text-[34px]">
                Got a quote
                <span className="block text-chalk/40">from the shop?</span>
              </h2>
              <p className="mt-3 text-[15px] leading-snug text-chalk/65">
                Upload it. We&apos;ll read every line, flag prices that look high, and show you which jobs you could do
                yourself, right on your car.
              </p>
              <div className="mt-5">
                <QuoteUpload />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 text-[15px] text-chalk/70">
                <button
                  onClick={() => {
                    tick();
                    setQuote(QUOTE_FIXTURE);
                  }}
                  className="-my-1 min-h-11 text-left"
                >
                  No quote handy? <span className="text-beam">Try a sample quote</span>
                </button>
                {process.env.NODE_ENV === "development" && (
                  <span className="flex gap-3 text-xs text-chalk/35">
                    Test:
                    <button onClick={() => setQuote([])}>empty</button>
                    <button onClick={() => setQuote(QUOTE_FIXTURE.slice(0, 1))}>one line</button>
                  </span>
                )}
              </div>
            </m.section>
          ) : (
            <m.section
              key="slip"
              aria-label="Your quote, marked up"
              className={`pointer-events-auto mx-auto flex min-h-0 w-full max-w-[34rem] flex-col transition-[max-height] duration-500 sm:mx-0 sm:max-h-full sm:w-[27rem] ${
                picked ? "max-h-[40svh]" : "max-h-[52svh]"
              }`}
              initial={{ opacity: 0, y: 80, rotate: 2 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              exit={{ opacity: 0, y: 40, transition: { duration: 0.2 } }}
              transition={{ type: "spring", stiffness: 140, damping: 20 }}
            >
              <div className="no-scrollbar min-h-0 overflow-y-auto overscroll-contain rounded-t-[6px] pb-3">
                <QuoteSlip
                  items={quote}
                  vehicle={vehicleLine}
                  sample={quote === QUOTE_FIXTURE}
                  selected={s.selected}
                  onPick={pick}
                  onGuide={(id) => router.push(`/garage?part=${id}&guide=1`)}
                />
                <div className="mt-3 space-y-1">
                  <QuoteUpload compact />
                  <button
                    onClick={() => {
                      tick();
                      setQuote(null);
                    }}
                    className="flex min-h-11 w-full items-center justify-center gap-2 text-[14px] text-chalk/50 transition hover:text-chalk"
                  >
                    <IconReceipt width={16} height={16} />
                    Clear this quote
                  </button>
                </div>
              </div>
            </m.section>
          )}
        </AnimatePresence>
      </div>

      <m.footer
        className="relative flex justify-center px-3 pb-3 pt-3 sm:px-6 sm:pb-6"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.1 }}
      >
        <ModeSwitch
          place="quote"
          quoteReady={hasQuote}
          onChange={(p) => router.push(p === "bay" ? "/garage?view=bay" : "/garage")}
        />
      </m.footer>
    </div>
  );
}
