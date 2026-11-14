"use client";

import { useRef, useState, useSyncExternalStore, type ChangeEvent } from "react";
import { useOnline } from "@/lib/pwa";
import { QuoteError, quoteFileProblem, submitQuote } from "@/lib/quote-client";
import { useScene } from "@/lib/scene-context";

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
 * Lets the user pick the PDF of their repair quote and sends it to be read.
 * Quote reading costs API credit, so it sits behind a password that the server checks.
 * On success the lines land in the scene state (`quote`), where the quote list picks them up.
 * Has no panel of its own: place it inside a `glass` panel.
 */
export function QuoteUpload() {
  const { vehicle, quote, setQuote } = useScene();
  const online = useOnline();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** The password the server accepted earlier on this device ("" on the server and until one is saved). */
  const remembered = useSyncExternalStore(saved.subscribe, saved.get, () => "");
  const [typed, setTyped] = useState("");
  /** With a remembered password the field collapses to one line. */
  const unlocked = remembered !== "";
  const password = (remembered || typed).trim();

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Clear the input so picking the same file again still fires a change event.
    e.target.value = "";
    if (!file) return;

    setError(null);
    const problem = quoteFileProblem(file);
    if (problem) return setError(problem);
    if (!navigator.onLine) return setError("You are offline. Connect to the internet to read a quote.");

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

  return (
    <div>
      {unlocked ? (
        <p className="mb-3 flex items-center justify-between text-xs text-white/55">
          Password saved on this device.
          <button
            type="button"
            onClick={() => {
              saved.set("");
              setTyped("");
            }}
            disabled={busy}
            className="-my-3 min-h-11 px-2 text-accent disabled:opacity-40"
          >
            Change
          </button>
        </p>
      ) : (
        <label className="mb-3 block">
          <span className="text-xs text-white/55">Password</span>
          <input
            type="password"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Ask the team for it"
            autoComplete="current-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            disabled={busy}
            // 16px text: iOS zooms the page when a smaller input takes focus.
            className="mt-1 min-h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-base outline-none placeholder:text-white/30 focus:border-accent/60"
          />
        </label>
      )}

      <input ref={input} type="file" accept="application/pdf,.pdf" onChange={onPick} className="sr-only" tabIndex={-1} aria-hidden />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy || !online || !password}
        aria-busy={busy}
        className="min-h-12 w-full rounded-xl bg-white px-5 text-sm font-medium text-black transition active:scale-[0.98] disabled:opacity-40"
      >
        {busy ? "Reading your quote…" : quote ? "Upload a different quote" : "Upload your quote (PDF)"}
      </button>

      <div className="mt-3 text-xs text-white/55" aria-live="polite">
        {busy ? (
          <p>
            Reading <span className="text-white/85">{fileName}</span>. This takes up to 30 seconds.
          </p>
        ) : !online ? (
          <p>You are offline. Connect to the internet to read a quote.</p>
        ) : (
          <p>PDF, up to 4 MB. Your quote is sent to Claude to be read. KYC does not keep it.</p>
        )}
      </div>

      {error && !busy && (
        <p role="alert" className="mt-3 text-sm text-shop">
          {error}
        </p>
      )}
    </div>
  );
}
