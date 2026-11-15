import type { QuoteItem } from "./quote";
import { SAMPLE_QUOTES } from "./sample-quotes";

/** Largest PDF the picker accepts. */
export const MAX_QUOTE_PDF_BYTES = 4 * 1024 * 1024;

/** Why a file cannot be used, as a sentence for the user, or null when the file is fine. */
export function quoteFileProblem(file: { type: string; size: number; name?: string }) {
  const isPdf = file.type === "application/pdf" || (!file.type && /\.pdf$/i.test(file.name ?? ""));
  if (!isPdf) return "That file is not a PDF. Choose the PDF of your quote.";
  if (file.size === 0) return "That PDF is empty.";
  if (file.size > MAX_QUOTE_PDF_BYTES) return "That PDF is larger than 4 MB. Choose a smaller file.";
  return null;
}

/** How long the upload pretends to work, so the busy state is visible. */
const SAMPLE_DELAY_MS = 1400;

/** Index of the sample shown last, so two uploads in a row never show the same quote. */
let lastSample = -1;

/**
 * Returns the lines of a quote for the picked PDF.
 *
 * The PDF is NOT read and is not sent anywhere: the result is one of the five quotes in
 * lib/sample-quotes.ts, chosen at random. No network, no password, no API credit. To read real
 * PDFs again, call an API route here instead (the removed one is in git history, and the Claude
 * helpers it used are in lib/server/ai.ts).
 *
 * Throws an Error whose message is a sentence that can be shown to the user as it is.
 */
export async function submitQuote(file: File): Promise<QuoteItem[]> {
  const problem = quoteFileProblem(file);
  if (problem) throw new Error(problem);

  let pick = Math.floor(Math.random() * SAMPLE_QUOTES.length);
  if (pick === lastSample) pick = (pick + 1) % SAMPLE_QUOTES.length;
  lastSample = pick;

  await new Promise((resolve) => setTimeout(resolve, SAMPLE_DELAY_MS));
  // A copy, so callers cannot change the samples.
  return SAMPLE_QUOTES[pick].map((item) => ({ ...item }));
}
