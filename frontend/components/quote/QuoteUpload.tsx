"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { AnimatePresence, m } from "motion/react";
import { IconUpload, IconWarning } from "@/components/ui/icons";
import { quoteFileProblem, submitQuote } from "@/lib/quote-client";
import { useScene } from "@/lib/scene-context";
import { tick } from "@/lib/ui";

/**
 * Lets the user pick (or drop) the PDF of their repair quote, then shows a quote.
 * For now the PDF is not read: any PDF shows one of five sample quotes (see lib/quote-client.ts).
 * On success the lines land in the scene state (`quote`), where the quote page picks them up.
 * `compact` is the one-button "Upload a different quote" form shown under a quote.
 * `simulating`: a sample upload is playing (see the quote page), so show the same scan a real
 * upload shows, for this made-up file name.
 */
export function QuoteUpload({ compact = false, simulating = null }: { compact?: boolean; simulating?: string | null }) {
  const { setQuote } = useScene();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function read(file: File | undefined) {
    if (!file || busy) return;
    setError(null);
    const problem = quoteFileProblem(file);
    if (problem) return setError(problem);

    tick();
    setFileName(file.name);
    setBusy(true);
    try {
      setQuote(await submitQuote(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Clear the input so picking the same file again still fires a change event.
    e.target.value = "";
    void read(file);
  }

  // Desktop: drop the PDF straight onto the slot.
  const dropProps = {
    onDragOver: (e: DragEvent) => {
      e.preventDefault();
      if (!over) setOver(true);
    },
    onDragLeave: () => setOver(false),
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      setOver(false);
      void read(e.dataTransfer.files?.[0]);
    },
  };

  const fileInput = (
    <input ref={input} type="file" accept="application/pdf,.pdf" onChange={onPick} className="sr-only" tabIndex={-1} aria-hidden />
  );

  const errorLine = (
    <AnimatePresence>
      {error && !busy && (
        <m.p
          role="alert"
          className="mt-3 flex items-start gap-2 text-sm text-stop"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
        >
          <IconWarning width={17} height={17} className="mt-px shrink-0" />
          {error}
        </m.p>
      )}
    </AnimatePresence>
  );

  if (compact) {
    return (
      <div {...dropProps}>
        {fileInput}
        {busy ? (
          <Reading fileName={fileName} compact />
        ) : (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white/[0.08] text-[15px] font-medium text-chalk/90 transition active:scale-[0.98]"
          >
            <IconUpload width={18} height={18} />
            Upload a different quote
          </button>
        )}
        {errorLine}
      </div>
    );
  }

  return (
    <div>
      {fileInput}
      {/* The slot the paper goes into. Tap it, or drop a PDF on it. */}
      <div {...dropProps}>
        {busy || simulating ? (
          <Reading fileName={simulating ?? fileName} />
        ) : (
          <button
            type="button"
            onClick={() => input.current?.click()}
            aria-describedby="quote-upload-note"
            className={`group relative flex w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-[22px] border border-dashed px-5 py-7 text-center transition-[border-color,background-color] active:scale-[0.99] ${
              over ? "border-beam bg-beam/10" : "border-white/20 bg-white/[0.03] hover:border-white/35"
            }`}
          >
            <span className="grid size-14 place-items-center rounded-2xl bg-chalk text-ink shadow-[0_10px_30px_-10px_rgb(243_241_236/0.5)] transition-transform group-hover:-translate-y-0.5">
              <IconUpload width={24} height={24} />
            </span>
            <span>
              <span className="block text-[17px] font-semibold">{over ? "Drop it here" : "Upload your quote"}</span>
              <span className="mt-1 block text-[13px] text-chalk/50">The PDF from the shop · up to 4 MB</span>
            </span>
          </button>
        )}
      </div>

      {errorLine}

      <p id="quote-upload-note" className="mt-3 text-[12.5px] leading-snug text-chalk/40">
        Your file stays on this device.
      </p>
    </div>
  );
}

/** While the quote is read: a sheet of paper going through a scanner. */
function Reading({ fileName, compact }: { fileName: string | null; compact?: boolean }) {
  // Dots that tick along, so a short wait still reads as work being done.
  const [dots, setDots] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setDots((d) => (d % 3) + 1), 380);
    return () => clearInterval(id);
  }, []);

  return (
    <div aria-busy aria-live="polite" className={`flex items-center gap-4 rounded-[22px] border border-beam/30 bg-beam/[0.06] ${compact ? "p-3" : "p-4"}`}>
      <div className="relative h-[68px] w-[52px] shrink-0 overflow-hidden rounded-[4px] bg-[#ece7da] p-2">
        {[0.9, 0.7, 0.8, 0.55, 0.75, 0.6].map((w, i) => (
          <div key={i} className="mb-[5px] h-[3px] rounded-full bg-[#1b1b1d]/25" style={{ width: `${w * 100}%` }} />
        ))}
        <m.div
          aria-hidden
          className="absolute inset-x-0 h-5 bg-gradient-to-b from-transparent via-beam/60 to-transparent"
          style={{ boxShadow: "0 0 14px 2px rgb(107 151 255 / 0.5)" }}
          initial={{ top: "-20%" }}
          animate={{ top: ["-20%", "100%"] }}
          transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut", repeatType: "reverse" }}
        />
      </div>
      <div className="min-w-0">
        <div className="text-[16px] font-semibold">
          Reading your quote<span aria-hidden className="inline-block w-5 text-left">{".".repeat(dots)}</span>
        </div>
        <div className="mt-0.5 truncate text-[13px] text-chalk/55">{fileName}</div>
      </div>
    </div>
  );
}
