// The shape of a quote (see quote-pipeline-plan.md). The quote UI consumes these shapes.
// For now quotes come from lib/sample-quotes.ts, not from a PDF read by Claude.
// Pure data and types: safe to import from both server and client code.
import { PARTS } from "./car";

/**
 * The clickable parts a quote line can point at. Written out by hand so that PartId is a real
 * union type (PARTS is typed as Part[], whose ids are plain strings). Keep in step with PARTS in
 * lib/car.ts: the check below warns in development when the two lists differ.
 */
export const PART_IDS = [
  "air_filter_box",
  "battery",
  "washer_fluid_cap",
  "wiper",
  "coolant_reservoir",
  "oil_dipstick",
  "oil_fill_cap",
  "brake_fluid_reservoir",
  "fuse_box",
  "engine_cover",
  "intake_duct",
] as const;

export type PartId = (typeof PART_IDS)[number];

export const isPartId = (id: unknown): id is PartId => PART_IDS.includes(id as PartId);

/** One repair or service line from the quote PDF. */
export type QuoteItem = {
  /** 1, 2, 3 ... in the order the lines appear in the PDF */
  index: number;
  /** what needs fixing, in plain words */
  description: string;
  /** price of this line in whole US dollars */
  amount: number;
  /** only ever true when relevantPart is a part with status "diy" */
  canDIY: boolean;
  /** the price is above the average for this job; shown as the orange "Above average" pill */
  isHighPrice: boolean;
  /** null when the line matches no part in the app, for example a tire rotation */
  relevantPart: PartId | null;
};

/**
 * Body of a quote-reading API response, for when a server route reads real PDFs again. Success is
 * status 200 with `items` (possibly empty: no repair lines found). Failure is a 4xx/5xx status
 * with `error`, a sentence the UI can show as it is.
 */
export type QuoteResponse = { items: QuoteItem[] } | { error: string };

if (process.env.NODE_ENV !== "production") {
  const actual = PARTS.map((p) => p.id);
  const missing = actual.filter((id) => !isPartId(id));
  const extra = PART_IDS.filter((id) => !actual.includes(id));
  if (missing.length || extra.length) {
    console.warn(
      `[KYC] PART_IDS in lib/quote.ts is out of step with PARTS in lib/car.ts.` +
        (missing.length ? ` Missing: ${missing.join(", ")}.` : "") +
        (extra.length ? ` Unknown: ${extra.join(", ")}.` : ""),
    );
  }
}
