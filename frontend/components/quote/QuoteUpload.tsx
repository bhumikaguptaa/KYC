"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ChangeEvent, type DragEvent } from "react";
import { AnimatePresence, m } from "motion/react";
import { IconUpload, IconWarning } from "@/components/ui/icons";
import { useOnline } from "@/lib/pwa";
import { QuoteError, quoteFileProblem, submitQuote } from "@/lib/quote-client";
import { useScene } from "@/lib/scene-context";
import { tick } from "@/lib/ui";

/** Where the password is remembered on this device, so it is typed once. */
const PASSWORD_KEY = "kyc:quote-password";
const listeners = new Set<() => void>();
const saved = {
  get: () => {
    try {
      return localStorage.getItem(PASSWORD_KEY) ?? "";
    } catch {
      return ""; // private mode, or storage blocked
    }
  },
  set: (v: string) => {
    try {
      if (v) localStorage.setItem(PASSWORD_KEY, v);
      else localStorage.removeItem(PASSWORD_KEY);
    } catch {}
    listeners.forEach((l) => l());
  },
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => void listeners.delete(l);
  },
};

/**
 * Lets the user pick (or drop) the PDF of their repair quote and sends it to be read.
 * Quote reading costs API credit, so it sits behind a password that the server checks.
 * On success the lines land in the scene state (`quote`), where the quote page picks them up.
 * `compact` is the one-line "Read a different quote" form shown under a quote.
 */
export function QuoteUpload({ compact = false }: { compact?: boolean }) {
  const { vehicle, setQuote } = useScene();
  const online = useOnline();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** The password the server accepted earlier on this device ("" on the server and until one is saved). */
  const remembered = useSyncExternalStore(saved.subscribe, saved.get, () => "");
  const [typed, setTyped] = useState("");
  /** With a remembered password the field collapses to one line. */
  const unlocked = remembered !== "";
  const password = (remembered || typed).trim();
  const ready = online && !!password && !busy;

  async function read(file: File | undefined) {
    if (!file) return;
    setError(null);
    const problem = quoteFileProblem(file);
    if (problem) return setError(problem);
    if (!navigator.onLine) return setError("You are offline. Connect to the internet to read a quote.");
    if (!password) return setError("Enter the password first.");

    tick();
    setFileName(file.name);
    setBusy(true);
    try {
      setQuote(await submitQuote(file, password, vehicle));
      // Only a password the server accepted is remembered.
      saved.set(password);
    } catch (err) {
      if (err instanceof QuoteError && err.wrongPassword) {
        saved.set("");
        setTyped("");
      }
      setError(err instanceof Error ? err.message : "Something went wrong while reading the quote. Try again.");
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
      if (!busy) void read(e.dataTransfer.files?.[0]);
    },
  };

  const passwordField = unlocked ? (
    <p className="flex items-center justify-between text-[13px] text-chalk/50">
      <span className="flex items-center gap-2">
        <span className="lamp size-1.5 rounded-full text-go" aria-hidden />
        Password saved on this device
      </span>
      <button
        type="button"
        onClick={() => {
          saved.set("");
          setTyped("");
        }}
        disabled={busy}
        className="-my-3 min-h-11 px-2 text-beam disabled:opacity-40"
      >
        Change
      </button>
    </p>
  ) : (
    <label className="block">
      <span className="gauge-label">Password</span>
      <input
        type="password"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        placeholder="Ask the KYC team for it"
        autoComplete="current-password"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        disabled={busy}
        // 16px text: iOS zooms the page when a smaller input takes focus.
        className="mt-1.5 min-h-12 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-base outline-none transition-colors placeholder:text-chalk/30 focus:border-beam/60"
      />
    </label>
  );

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
          <>
            {!unlocked && <div className="mb-3">{passwordField}</div>}
            <button
              type="button"
              onClick={() => input.current?.click()}
              disabled={!ready}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white/[0.08] text-[15px] font-medium text-chalk/90 transition active:scale-[0.98] disabled:opacity-40"
            >
              <IconUpload width={18} height={18} />
              Read a different quote
            </button>
          </>
        )}
        {errorLine}
      </div>
    );
  }

  return (
    <div>
      {fileInput}
      <div className="mb-4">{passwordField}</div>

      {/* The slot the paper goes into. Tap it, or drop a PDF on it. */}
      <div {...dropProps}>
        {busy ? (
          <Reading fileName={fileName} />
        ) : (
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={!ready}
            aria-describedby="quote-upload-note"
            className={`group relative flex w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-[22px] border border-dashed px-5 py-7 text-center transition-[border-color,background-color,opacity] active:scale-[0.99] disabled:opacity-45 ${
              over ? "border-beam bg-beam/10" : "border-white/20 bg-white/[0.03] enabled:hover:border-white/35"
            }`}
          >
            <span className="grid size-14 place-items-center rounded-2xl bg-chalk text-ink shadow-[0_10px_30px_-10px_rgb(243_241_236/0.5)] transition-transform group-enabled:group-hover:-translate-y-0.5">
              <IconUpload width={24} height={24} />
            </span>
            <span>
              <span className="block text-[17px] font-semibold">{over ? "Drop it here" : "Upload your quote"}</span>
              <span className="mt-1 block text-[13px] text-chalk/50">
                {!online ? "You are offline. Connect to the internet to read a quote." : !password ? "Enter the password first" : "The PDF from the shop · up to 4 MB"}
              </span>
            </span>
          </button>
        )}
      </div>

      {errorLine}

      <p id="quote-upload-note" className="mt-3 text-[12.5px] leading-snug text-chalk/40">
        Your quote is sent to Claude to be read. KYC does not keep it.
      </p>
    </div>
  );
}

/**
 * While the quote is read: a sheet of paper going through a scanner, and a clock. The clock
 * is real elapsed time, not made-up progress steps.
 */
function Reading({ fileName, compact }: { fileName: string | null; compact?: boolean }) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const t0 = performance.now();
    const id = setInterval(() => setSecs(Math.floor((performance.now() - t0) / 1000)), 250);
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
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", repeatType: "reverse" }}
        />
      </div>
      <div className="min-w-0">
        <div className="text-[16px] font-semibold">Reading your quote…</div>
        <div className="mt-0.5 truncate text-[13px] text-chalk/55">{fileName}</div>
        <div className="mt-1.5 font-mono text-[12px] tabular-nums text-beam">
          {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}
          <span className="text-chalk/40"> · usually under 30 s</span>
        </div>
      </div>
    </div>
  );
}
