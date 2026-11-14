import { createHash, timingSafeEqual } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { partById } from "@/lib/car";
import { PART_IDS, type QuoteItem, type QuoteResponse } from "@/lib/quote";
import { MAX_QUOTE_PDF_BYTES, QUOTE_PASSWORD_HEADER, quoteFileProblem } from "@/lib/quote-client";
import { QUOTE_SYSTEM_PROMPT, buildQuoteUserPrompt } from "@/lib/quote-prompt";

// Reads a repair quote PDF with Claude and returns one item per repair line.
// POST multipart/form-data: `file` (the PDF) and optional `year`, `make`, `model` of the car.
// The `x-kyc-password` header must match SUPERSECRETPASSWORD, so strangers cannot spend our API credit.
// Server-only: the API key and the password never reach the browser bundle.

/** Reading a PDF takes 10-30 seconds; without this Vercel may stop the function early. */
export const maxDuration = 60;

const MODEL = "claude-opus-5-5";

/**
 * The shape Claude must answer in. The API enforces it, so `relevantPart` can only be one of our
 * part ids or null: Claude cannot invent a part.
 */
const QuoteSchema = z.object({
  items: z.array(
    z.object({
      index: z.number().int(),
      description: z.string(),
      amount: z.number(),
      canDIY: z.boolean(),
      isHighPrice: z.boolean(),
      relevantPart: z.enum(PART_IDS).nullable(),
    }),
  ),
});

/**
 * Logging. Every request gets a short id, and every step writes one JSON line that carries it, so
 * one request can be followed from start to finish in the terminal (`npm run dev`) or in the
 * Vercel logs (search for the id, or for "kyc.quote"). The id also goes back to the browser in the
 * `x-kyc-request-id` header and is printed in the browser console when a request fails.
 *
 * Never logged: the PDF contents, the file name (it can hold a person's name), the API key and
 * the password.
 */
function createLog(id: string) {
  const started = Date.now();
  const line = (level: "info" | "warn" | "error", step: string, data: Record<string, unknown> = {}) =>
    console[level](JSON.stringify({ scope: "kyc.quote", id, step, ms: Date.now() - started, ...data }));
  return {
    info: (step: string, data?: Record<string, unknown>) => line("info", step, data),
    warn: (step: string, data?: Record<string, unknown>) => line("warn", step, data),
    error: (step: string, data?: Record<string, unknown>) => line("error", step, data),
  };
}
type Log = ReturnType<typeof createLog>;

/** Everything useful about a thrown value, in a shape that survives JSON.stringify. */
function describeError(error: unknown) {
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

/**
 * True when the two strings are equal. Compares hashes in constant time, so the time the check
 * takes tells an attacker nothing about how close a guess was.
 */
function samePassword(given: string, expected: string) {
  const hash = (v: string) => createHash("sha256").update(v).digest();
  return timingSafeEqual(hash(given), hash(expected));
}

/** A short, single-line form value: these go into the prompt, so they are kept small and plain. */
function field(form: FormData, key: string) {
  const v = form.get(key);
  return typeof v === "string" ? v.replace(/[^\w .\-/]/g, "").trim().slice(0, 40) : "";
}

/**
 * The rules the app relies on, applied after Claude answers so they hold no matter what it said:
 * whole-dollar amounts, no negative or empty lines, "do it yourself" only for parts the app marks
 * as diy, and items numbered 1, 2, 3 in order.
 */
function normalize(items: z.infer<typeof QuoteSchema>["items"], log: Log): QuoteItem[] {
  const kept = items.filter((it) => {
    const ok = it.description.trim() !== "" && Number.isFinite(it.amount) && it.amount >= 0;
    if (!ok) log.warn("rules.dropped-item", { modelIndex: it.index, amount: it.amount, emptyDescription: !it.description.trim() });
    return ok;
  });
  return kept.map((it, i) => {
    const status = partById(it.relevantPart)?.status ?? null;
    const canDIY = it.canDIY && status === "diy";
    if (it.canDIY && !canDIY) {
      // Claude said "do it yourself" for a line the app does not allow it on.
      log.warn("rules.diy-turned-off", { index: i + 1, relevantPart: it.relevantPart, partStatus: status });
    }
    return {
      index: i + 1,
      description: it.description.trim(),
      amount: Math.round(it.amount),
      canDIY,
      isHighPrice: it.isHighPrice,
      relevantPart: it.relevantPart,
    };
  });
}

export async function POST(request: Request) {
  const id = crypto.randomUUID().slice(0, 8);
  const log = createLog(id);
  /** Sends the answer, and logs how the request ended. */
  const reply = (body: QuoteResponse, status = 200) => {
    if ("error" in body) log.warn("reply.error", { status, error: body.error });
    else log.info("reply.ok", { status, items: body.items.length });
    return Response.json(body, { status, headers: { "x-kyc-request-id": id } });
  };

  log.info("request.received", {
    contentLength: request.headers.get("content-length"),
    contentType: request.headers.get("content-type")?.split(";")[0],
  });

  // Password gate. First, before any work: a caller without the password learns nothing else and
  // costs nothing. If the server has no password set, the route stays closed rather than open.
  const expectedPassword = process.env.SUPERSECRETPASSWORD?.trim();
  if (!expectedPassword) {
    log.error("config.missing-password", {
      hint: "Set SUPERSECRETPASSWORD in frontend/.env (local) or in the Vercel project settings, then restart the server.",
    });
    return reply({ error: "Quote reading is not set up yet: the server has no SUPERSECRETPASSWORD." }, 500);
  }
  const givenPassword = request.headers.get(QUOTE_PASSWORD_HEADER)?.trim() ?? "";
  if (!givenPassword || !samePassword(givenPassword, expectedPassword)) {
    // The password itself is never logged, only whether one was sent.
    log.warn("auth.rejected", {
      passwordSent: givenPassword !== "",
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });
    return reply({ error: givenPassword ? "Wrong password." : "Enter the password to read a quote." }, 401);
  }
  log.info("auth.ok");

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    log.error("config.missing-api-key", {
      hint: "Set ANTHROPIC_API_KEY in frontend/.env (local) or in the Vercel project settings, then restart the server.",
    });
    return reply({ error: "Quote reading is not set up yet: the server has no ANTHROPIC_API_KEY." }, 500);
  }
  if (!apiKey.startsWith("sk-ant-")) {
    log.warn("config.api-key-looks-wrong", { hint: "Anthropic API keys start with sk-ant-.", length: apiKey.length });
  }

  // Refuse oversized uploads before reading them into memory.
  if (Number(request.headers.get("content-length") ?? 0) > MAX_QUOTE_PDF_BYTES + 64 * 1024) {
    return reply({ error: "That PDF is larger than 4 MB. Choose a smaller file." }, 413);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch (error) {
    log.warn("upload.unreadable-form", describeError(error));
    return reply({ error: "Send the quote as a PDF file upload." }, 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    log.warn("upload.no-file", { fields: [...form.keys()], fileFieldType: file === null ? "missing" : typeof file });
    return reply({ error: "Choose the PDF of your quote first." }, 400);
  }
  log.info("upload.file", { bytes: file.size, type: file.type || "(none)" });
  const problem = quoteFileProblem(file);
  if (problem) return reply({ error: problem }, file.size > MAX_QUOTE_PDF_BYTES ? 413 : 400);

  const bytes = Buffer.from(await file.arrayBuffer());
  // Every PDF starts with "%PDF-". Catches other files renamed to .pdf.
  const header = bytes.subarray(0, 5).toString("latin1");
  if (header !== "%PDF-") {
    log.warn("upload.not-a-pdf", { firstBytesHex: bytes.subarray(0, 8).toString("hex") });
    return reply({ error: "That file is not a PDF. Choose the PDF of your quote." }, 400);
  }

  const vehicle = { year: field(form, "year"), make: field(form, "make"), model: field(form, "model") };
  const userPrompt = buildQuoteUserPrompt(vehicle);
  log.info("claude.request", { model: MODEL, vehicle, pdfBytes: bytes.length, promptChars: userPrompt.length });

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.beta.messages.parse(
      {
        model: MODEL,
        max_tokens: 16000,
        // If the model declines the request for policy reasons, the API retries on its default
        // fallback model inside the same call.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: {
          // Reading lines off a quote is extraction, not hard reasoning: low effort is faster and cheaper.
          effort: "low",
          format: betaZodOutputFormat(QuoteSchema),
        },
        system: QUOTE_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              // The document goes before the question about it.
              { type: "document", source: { type: "base64", media_type: "application/pdf", data: bytes.toString("base64") } },
              { type: "text", text: userPrompt },
            ],
          },
        ],
      },
      // Stay inside maxDuration: one attempt, and give up before Vercel does.
      { timeout: 50_000, maxRetries: 0 },
    );

    log.info("claude.response", {
      anthropicRequestId: message._request_id,
      messageId: message.id,
      servedByModel: message.model,
      stopReason: message.stop_reason,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      blocks: message.content.map((b) => b.type),
      parsed: message.parsed_output !== null,
    });

    if (message.stop_reason === "refusal" || message.stop_reason === "max_tokens" || !message.parsed_output) {
      // The raw text shows what came back when it could not be parsed into the schema.
      const rawText = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("").slice(0, 2000);
      log.error("claude.unusable-answer", { stopReason: message.stop_reason, stopDetails: message.stop_details, rawText });
      return reply({ error: "We cannot read that quote. Try a clearer PDF." }, 502);
    }

    const raw = message.parsed_output.items;
    const items = normalize(raw, log);
    log.info("rules.applied", {
      fromModel: raw.length,
      kept: items.length,
      diy: items.filter((it) => it.canDIY).length,
      highPrice: items.filter((it) => it.isHighPrice).length,
      noPart: items.filter((it) => it.relevantPart === null).length,
      parts: items.map((it) => it.relevantPart),
    });
    // The full lines are logged in development only: they are the user's quote.
    if (process.env.NODE_ENV !== "production") log.info("rules.items", { items });

    return reply({ items });
  } catch (error) {
    // Most specific first. Full details go to the log; the user gets a sentence they can act on.
    const details = describeError(error);
    if (error instanceof Anthropic.APIConnectionTimeoutError) {
      log.error("claude.timeout", { ...details, hint: "No answer within 50 s. Large or scanned PDFs take longest." });
      return reply({ error: "Reading the quote took too long. Try again." }, 504);
    }
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
      log.error("claude.key-rejected", { ...details, hint: "Check ANTHROPIC_API_KEY: wrong, revoked, or without access to this model." });
      return reply({ error: "Quote reading is not set up correctly: the server's API key was rejected." }, 500);
    }
    if (error instanceof Anthropic.RateLimitError) {
      log.error("claude.rate-limited", { ...details, retryAfter: error.headers?.get("retry-after") });
      return reply({ error: "Quote reading is busy right now. Try again in a minute." }, 503);
    }
    if (error instanceof Anthropic.BadRequestError) {
      // Either the PDF itself (password-protected, damaged, too many pages) or a request field
      // the API no longer accepts. The logged message says which.
      log.error("claude.bad-request", { ...details, hint: "Read `message`: it names the field or the document problem." });
      return reply({ error: "We cannot read that PDF. It may be damaged, password-protected or too long." }, 422);
    }
    if (error instanceof Anthropic.APIConnectionError) {
      log.error("claude.network", { ...details, hint: "The server could not reach api.anthropic.com." });
      return reply({ error: "Quote reading is not available right now. Try again." }, 502);
    }
    if (error instanceof Anthropic.APIError) {
      log.error("claude.api-error", details);
      return reply({ error: "Quote reading is not available right now. Try again." }, 502);
    }
    log.error("unexpected", details);
    return reply({ error: "Something went wrong while reading the quote. Try again." }, 500);
  }
}
