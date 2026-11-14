import type { QuoteItem, QuoteResponse } from "./quote";
import type { QuoteVehicle } from "./quote-prompt";

/**
 * Largest PDF we accept. Vercel rejects any request body over 4.5 MB, so the limit sits under
 * that with room for the form fields. Checked in the browser and again on the server.
 */
export const MAX_QUOTE_PDF_BYTES = 4 * 1024 * 1024;

/** Request header that carries the password. The server compares it with SUPERSECRETPASSWORD. */
export const QUOTE_PASSWORD_HEADER = "x-kyc-password";

/** A failed quote request. `message` is a sentence for the user; `status` is the HTTP status (0: no response). */
export class QuoteError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "QuoteError";
  }
  /** The server refused the password (or none was sent). */
  get wrongPassword() {
    return this.status === 401;
  }
}

/** Why a file cannot be uploaded, as a sentence for the user, or null when the file is fine. */
export function quoteFileProblem(file: { type: string; size: number; name?: string }) {
  const isPdf = file.type === "application/pdf" || (!file.type && /\.pdf$/i.test(file.name ?? ""));
  if (!isPdf) return "That file is not a PDF. Choose the PDF of your quote.";
  if (file.size === 0) return "That PDF is empty.";
  if (file.size > MAX_QUOTE_PDF_BYTES) return "That PDF is larger than 4 MB. Choose a smaller file.";
  return null;
}

/**
 * Sends a quote PDF to POST /api/quote and returns its lines.
 * `password` is what the user typed; the server checks it before doing anything else.
 * Throws a QuoteError whose message is a sentence that can be shown to the user as it is.
 */
export async function submitQuote(file: File, password: string, vehicle?: QuoteVehicle | null): Promise<QuoteItem[]> {
  const problem = quoteFileProblem(file);
  if (problem) throw new QuoteError(problem, 0);
  if (!password.trim()) throw new QuoteError("Enter the password to read a quote.", 401);

  const body = new FormData();
  body.set("file", file);
  for (const key of ["year", "make", "model"] as const) {
    const value = vehicle?.[key];
    if (value) body.set(key, value);
  }

  const started = performance.now();
  const seconds = () => ((performance.now() - started) / 1000).toFixed(1);
  console.info(`[KYC quote] uploading ${(file.size / 1024).toFixed(0)} KB PDF`);

  let res: Response;
  try {
    res = await fetch("/api/quote", { method: "POST", body, headers: { [QUOTE_PASSWORD_HEADER]: password.trim() } });
  } catch (error) {
    // fetch rejects only when the request never got an answer: no network, or the connection dropped.
    console.error(`[KYC quote] no response after ${seconds()} s (online: ${navigator.onLine})`, error);
    throw new QuoteError(
      navigator.onLine
        ? "We cannot reach the server. Try again."
        : "You are offline. Connect to the internet to read a quote.",
      0,
    );
  }
  // Search the server logs for this id to see every step of this request.
  const requestId = res.headers.get("x-kyc-request-id") ?? "(none: the route did not answer)";

  let data: QuoteResponse | null = null;
  try {
    data = (await res.json()) as QuoteResponse;
  } catch {
    // The platform, not our route, answered (for example a 413 page for an oversized body).
  }

  if (res.ok && data && "items" in data) {
    console.info(`[KYC quote] ${data.items.length} lines in ${seconds()} s (request ${requestId})`);
    return data.items;
  }
  console.error(`[KYC quote] failed: HTTP ${res.status} after ${seconds()} s (request ${requestId})`, data ?? "(response was not JSON)");
  if (data && "error" in data) throw new QuoteError(data.error, res.status);
  if (res.status === 413) throw new QuoteError("That PDF is larger than 4 MB. Choose a smaller file.", 413);
  if (res.status === 504) throw new QuoteError("Reading the quote took too long. Try again.", 504);
  throw new QuoteError("We cannot read that quote right now. Try again.", res.status);
}
