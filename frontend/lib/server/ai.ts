// Server-only helpers for talking to Claude. Import this from API routes only, never from a
// component: it reads the API key and the password from the environment.
//
// Nothing calls Claude yet. Quote reading used to (see git history for app/api/quote/route.ts);
// quotes now come from lib/sample-quotes.ts. These helpers stay for the chatbot: the password
// gate, the client, and the logging.
//
// Environment (frontend/.env locally, Vercel project settings when deployed):
//   ANTHROPIC_API_KEY     the Claude API key
//   SUPERSECRETPASSWORD   what a user must send before the app spends API credit
import { createHash, timingSafeEqual } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";

/** The model to use unless a route has a reason to pick another. */
export const AI_MODEL = "claude-opus-5-5";

/** Request header in which the browser sends the password. */
export const AI_PASSWORD_HEADER = "x-kyc-password";

/**
 * Logging. Every request gets a short id, and every step writes one JSON line that carries it, so
 * one request can be followed from start to finish in the terminal (`npm run dev`) or in the
 * Vercel logs (search for the id, or for the scope, for example "kyc.chat").
 *
 * Never log: user content, the API key, or the password.
 */
export function createLog(scope: string, id: string = crypto.randomUUID().slice(0, 8)) {
  const started = Date.now();
  const line = (level: "info" | "warn" | "error", step: string, data: Record<string, unknown> = {}) =>
    console[level](JSON.stringify({ scope, id, step, ms: Date.now() - started, ...data }));
  return {
    id,
    info: (step: string, data?: Record<string, unknown>) => line("info", step, data),
    warn: (step: string, data?: Record<string, unknown>) => line("warn", step, data),
    error: (step: string, data?: Record<string, unknown>) => line("error", step, data),
  };
}
export type Log = ReturnType<typeof createLog>;

/** Everything useful about a thrown value, in a shape that survives JSON.stringify. */
export function describeError(error: unknown) {
  if (error instanceof Anthropic.APIError) {
    return {
      kind: error.constructor.name,
      status: error.status,
      // Quote this id to Anthropic support, or look it up in the Console logs.
      anthropicRequestId: error.requestID,
      message: error.message,
      body: error.error,
    };
  }
  if (error instanceof Error) {
    return { kind: error.name, message: error.message, stack: error.stack, cause: error.cause ? String(error.cause) : undefined };
  }
  return { kind: typeof error, message: String(error) };
}

/** A refusal to continue: the HTTP status and a sentence the UI can show as it is. */
export type Refusal = { status: number; error: string };

/**
 * Password gate. Call it first in any route that spends API credit; a non-null result is the
 * answer to send back. If the server has no password set, the gate stays closed rather than open.
 */
export function checkPassword(request: Request, log: Log): Refusal | null {
  const expected = process.env.SUPERSECRETPASSWORD?.trim();
  if (!expected) {
    log.error("config.missing-password", {
      hint: "Set SUPERSECRETPASSWORD in frontend/.env (local) or in the Vercel project settings, then restart the server.",
    });
    return { status: 500, error: "The assistant is not set up yet: the server has no SUPERSECRETPASSWORD." };
  }
  const given = request.headers.get(AI_PASSWORD_HEADER)?.trim() ?? "";
  // Compare hashes in constant time, so the time taken says nothing about how close a guess was.
  const hash = (v: string) => createHash("sha256").update(v).digest();
  if (!given || !timingSafeEqual(hash(given), hash(expected))) {
    // The password itself is never logged, only whether one was sent.
    log.warn("auth.rejected", {
      passwordSent: given !== "",
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });
    return { status: 401, error: given ? "Wrong password." : "Enter the password first." };
  }
  log.info("auth.ok");
  return null;
}

/** The Claude client, or a Refusal when the server has no API key. */
export function getAnthropic(log: Log): Anthropic | Refusal {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    log.error("config.missing-api-key", {
      hint: "Set ANTHROPIC_API_KEY in frontend/.env (local) or in the Vercel project settings, then restart the server.",
    });
    return { status: 500, error: "The assistant is not set up yet: the server has no ANTHROPIC_API_KEY." };
  }
  if (!apiKey.startsWith("sk-ant-")) {
    log.warn("config.api-key-looks-wrong", { hint: "Anthropic API keys start with sk-ant-.", length: apiKey.length });
  }
  return new Anthropic({ apiKey });
}

/**
 * Turns an error thrown by a Claude call into a Refusal, and logs the full details.
 * Most specific first; the user gets a sentence they can act on.
 */
export function refusalForError(error: unknown, log: Log): Refusal {
  const details = describeError(error);
  if (error instanceof Anthropic.APIConnectionTimeoutError) {
    log.error("claude.timeout", details);
    return { status: 504, error: "That took too long. Try again." };
  }
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    log.error("claude.key-rejected", { ...details, hint: "Check ANTHROPIC_API_KEY: wrong, revoked, or without access to this model." });
    return { status: 500, error: "The assistant is not set up correctly: the server's API key was rejected." };
  }
  if (error instanceof Anthropic.RateLimitError) {
    log.error("claude.rate-limited", { ...details, retryAfter: error.headers?.get("retry-after") });
    return { status: 503, error: "The assistant is busy right now. Try again in a minute." };
  }
  if (error instanceof Anthropic.BadRequestError) {
    log.error("claude.bad-request", { ...details, hint: "Read `message`: it names the field the API did not accept." });
    return { status: 502, error: "The assistant could not handle that request." };
  }
  if (error instanceof Anthropic.APIConnectionError) {
    log.error("claude.network", { ...details, hint: "The server could not reach api.anthropic.com." });
    return { status: 502, error: "The assistant is not available right now. Try again." };
  }
  if (error instanceof Anthropic.APIError) {
    log.error("claude.api-error", details);
    return { status: 502, error: "The assistant is not available right now. Try again." };
  }
  log.error("unexpected", details);
  return { status: 500, error: "Something went wrong. Try again." };
}
