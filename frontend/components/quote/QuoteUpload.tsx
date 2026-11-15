"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { quoteFileProblem, submitQuote } from "@/lib/quote-client";
import { useScene } from "@/lib/scene-context";

/**
 * Lets the user pick the PDF of their repair quote, then shows a quote.
 * For now the PDF is not read: any PDF shows one of five sample quotes (see lib/quote-client.ts).
 * On success the lines land in the scene state (`quote`), where the quote list picks them up.
 * Has no panel of its own: place it inside a `glass` panel.
 */
export function QuoteUpload() {
  const { quote, setQuote } = useScene();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Clear the input so picking the same file again still fires a change event.
    e.target.value = "";
    if (!file) return;

    setError(null);
    const problem = quoteFileProblem(file);
    if (problem) return setError(problem);

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

  return (
    <div>
      <input ref={input} type="file" accept="application/pdf,.pdf" onChange={onPick} className="sr-only" tabIndex={-1} aria-hidden />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        aria-busy={busy}
        className="min-h-12 w-full rounded-xl bg-white px-5 text-sm font-medium text-black transition active:scale-[0.98] disabled:opacity-40"
      >
        {busy ? "Reading your quote…" : quote ? "Upload a different quote" : "Upload your quote (PDF)"}
      </button>

      <div className="mt-3 text-xs text-white/55" aria-live="polite">
        {busy ? (
          <p>
            Reading <span className="text-white/85">{fileName}</span>.
          </p>
        ) : (
          <p>PDF, up to 4 MB. Your file stays on this device.</p>
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
