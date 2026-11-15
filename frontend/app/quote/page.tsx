"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { m } from "motion/react";
import { spring } from "@/components/ui/MotionProvider";
import { QuoteList } from "@/components/quote/QuoteList";
import { QuoteUpload } from "@/components/quote/QuoteUpload";
import { QUOTE_FIXTURE } from "@/lib/quote-fixture";
import { useScene, type Glow } from "@/lib/scene-context";

/** Read a repair quote: each line, its price, and which parts you could do yourself. */
export default function QuotePage() {
  const router = useRouter();
  const { quote, setQuote, setGlows, setView, select, setXray, toggle } = useScene();
  const hasQuote = quote !== null;

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

  // The installed app has no browser back button, so the page brings its own.
  const back = () => (window.history.length > 1 ? router.back() : router.push("/"));

  return (
    <div className="flex h-full flex-col justify-end p-4 sm:justify-start sm:p-6">
      <m.section
        // More opaque than the other panels: the list is dense text, and the car behind it made it hard to read.
        className="glass pointer-events-auto flex max-h-[78%] w-full flex-col rounded-3xl bg-[rgb(20_20_23/0.94)] sm:max-h-full sm:w-[26rem]"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
      >
        <header className="flex items-center justify-between gap-3 px-5 pt-4">
          <button onClick={back} className="-my-3 -ml-1 min-h-11 pr-4 pl-1 text-xs font-medium tracking-[0.3em] text-white/45">
            ← BACK
          </button>
          {hasQuote && (
            <button onClick={() => setQuote(null)} className="-my-3 -mr-1 min-h-11 px-1 text-sm text-white/50">
              Clear
            </button>
          )}
        </header>

        {/* The list scrolls inside the panel, so the panel never runs off a phone screen. */}
        <div className="min-h-0 overflow-y-auto overscroll-contain px-5 pt-2 pb-5">
          <h1 className="text-2xl font-semibold tracking-tight">Your repair quote</h1>
          <p className="mt-1 text-sm text-white/55">
            See what each line costs, which prices are above average, and what you could do yourself.
          </p>

          <div className="mt-4">
            <QuoteUpload />
          </div>
          {/* A made-up quote: shows how the app works without picking a PDF. */}
          <div className="mt-1 flex items-center gap-3 text-xs text-white/40">
            <button onClick={() => setQuote(QUOTE_FIXTURE)} className="-my-2 min-h-11 text-accent">
              Try a sample quote
            </button>
            {process.env.NODE_ENV === "development" && (
              <>
                <span>Test:</span>
                <button onClick={() => setQuote([])}>empty</button>
                <button onClick={() => setQuote(QUOTE_FIXTURE.slice(0, 1))}>one line</button>
              </>
            )}
          </div>

          {quote && <QuoteList items={quote} />}
        </div>
      </m.section>
    </div>
  );
}
