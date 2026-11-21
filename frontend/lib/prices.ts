// Typical US shop prices for common jobs on a Honda Civic, so a quote line can be checked against
// real data instead of a guess. Pure data and functions: safe to import from server and client.
//
// Each range is parts plus labor at an independent shop, before tax, taken from one published
// source (named on each entry). Looked up in November 2026. Ranges are national averages and do
// not account for local labor rates, so the app says "typical", never "fair" or "too much".
//
// A job without a solid published range (for example a fluid top-up or a wiper blade swap) is
// left out on purpose: the quote line then keeps its own isHighPrice flag. Do not invent ranges.
import type { QuoteItem } from "./quote";

export type JobId =
  | "engine_air_filter"
  | "cabin_air_filter"
  | "battery"
  | "brake_fluid_flush"
  | "brake_pads"
  | "tire_rotation"
  | "wheel_alignment"
  | "spark_plugs"
  | "ac_recharge"
  | "check_engine_diagnosis"
  | "serpentine_belt";

export type PriceRange = {
  /** the job, in plain words */
  label: string;
  /** whole US dollars, parts and labor */
  low: number;
  high: number;
  /** where the range comes from */
  source: string;
  url: string;
};

export const PRICE_RANGES: Record<JobId, PriceRange> = {
  engine_air_filter: {
    label: "Engine air filter replacement",
    low: 67,
    high: 84,
    source: "RepairPal, 2018 Honda Civic",
    url: "https://repairpal.com/estimator/honda/civic/2018/air-filter-replacement-cost",
  },
  cabin_air_filter: {
    label: "Cabin air filter replacement",
    low: 60,
    high: 74,
    source: "RepairPal, Honda Civic",
    url: "https://repairpal.com/honda/civic",
  },
  battery: {
    label: "12V battery replacement",
    low: 227,
    high: 249,
    source: "RepairPal, Honda Civic",
    url: "https://repairpal.com/estimator/honda/civic/battery-replacement-cost",
  },
  brake_fluid_flush: {
    label: "Brake fluid flush",
    low: 173,
    high: 205,
    source: "Kelley Blue Book, average for all cars",
    url: "https://www.kbb.com/service-repair-guide/brake-fluid-flush-costs/",
  },
  brake_pads: {
    label: "Brake pad replacement, one axle",
    low: 319,
    high: 392,
    source: "Kelley Blue Book, 2019 Honda Civic",
    url: "https://www.kbb.com/honda/civic/2019/brake-repair/",
  },
  tire_rotation: {
    label: "Tire rotation",
    low: 49,
    high: 72,
    source: "RepairPal, Honda Civic",
    url: "https://repairpal.com/estimator/honda/civic/tire-rotation-cost",
  },
  wheel_alignment: {
    label: "Wheel alignment",
    low: 147,
    high: 182,
    source: "Kelley Blue Book, 2021 Honda Civic Type R, Kansas City area",
    url: "https://www.kbb.com/honda/civic-type-r/2021/wheel-alignment",
  },
  spark_plugs: {
    label: "Spark plug replacement",
    low: 180,
    high: 291,
    source: "RepairPal, 2025 Honda Civic",
    url: "https://www.repairpal.com/cars/honda/civic/2025",
  },
  ac_recharge: {
    label: "AC recharge",
    low: 234,
    high: 314,
    source: "RepairPal, Honda Civic",
    url: "https://www.repairpal.com/estimator/honda/civic/air-conditioning-expansion-valve-replacement-cost",
  },
  check_engine_diagnosis: {
    label: "Check engine light diagnosis",
    low: 122,
    high: 179,
    source: "RepairPal, Honda Civic",
    url: "https://repairpal.com/estimator/honda/civic/2025/check-engine-light-diagnosis-testing-cost",
  },
  serpentine_belt: {
    label: "Serpentine belt replacement",
    low: 271,
    high: 347,
    source: "YourMechanic shop and dealer price, 2018 Honda Civic 2.0L",
    url: "https://yourmechanic.com/estimates/honda/civic/serpentine-drive-belt-replacement",
  },
};

/**
 * How a description is matched to a job: every `has` pattern must match and no `not` pattern may.
 * Order matters: the first rule that fits wins, so narrower jobs come before broader ones
 * (cabin air filter before engine air filter).
 */
const RULES: { job: JobId; has: RegExp[]; not?: RegExp[] }[] = [
  { job: "cabin_air_filter", has: [/cabin\s+(air\s+)?filter/] },
  { job: "engine_air_filter", has: [/air\s+filter/] },
  // "Battery cable" or "battery terminal" work is a different, cheaper job.
  { job: "battery", has: [/battery/, /replace|new/], not: [/cable|terminal/] },
  { job: "brake_fluid_flush", has: [/brake\s+fluid/, /flush|exchange|replace/] },
  // Pads and rotors together cost far more than pads alone, so they get no range.
  { job: "brake_pads", has: [/brake\s+pads?/], not: [/rotor/, /all\s+four|front\s+and\s+rear/] },
  // "Rotate and balance" includes balancing, which a rotation price does not cover.
  { job: "tire_rotation", has: [/rotat/, /tire/], not: [/balanc/] },
  { job: "wheel_alignment", has: [/alignment/] },
  { job: "spark_plugs", has: [/spark\s+plug/] },
  { job: "ac_recharge", has: [/recharge/, /air\s+condition|\ba\/?c\b/] },
  { job: "check_engine_diagnosis", has: [/check[\s-]+engine/, /diagnos/] },
  { job: "serpentine_belt", has: [/serpentine|drive\s+belt/] },
];

/** The job a quote line describes, or null when no job with a price range fits. */
export function matchJob(description: string): JobId | null {
  const d = description.toLowerCase();
  for (const rule of RULES) {
    if (rule.has.every((re) => re.test(d)) && !rule.not?.some((re) => re.test(d))) return rule.job;
  }
  return null;
}

/**
 * The ranges describe a Honda Civic. With no car given they apply (the app's 3D car is a Civic);
 * for any other car they do not, rather than judge one car's prices by another's.
 */
export function rangesApplyTo(vehicle: string | null | undefined) {
  return !vehicle || /honda\s+civic/i.test(vehicle);
}

export type PriceVerdict = "below" | "typical" | "above";

export type PriceCheck = {
  job: JobId;
  range: PriceRange;
  verdict: PriceVerdict;
  /** dollars above the top of the range; 0 unless the verdict is "above" */
  overBy: number;
};

/** Checks one quote line against its typical range, or null when there is no range for it. */
export function priceCheck(item: QuoteItem, vehicle?: string | null): PriceCheck | null {
  if (!rangesApplyTo(vehicle)) return null;
  const job = matchJob(item.description);
  if (!job) return null;
  const range = PRICE_RANGES[job];
  const verdict: PriceVerdict = item.amount > range.high ? "above" : item.amount < range.low ? "below" : "typical";
  return { job, range, verdict, overBy: verdict === "above" ? item.amount - range.high : 0 };
}

/**
 * Whether to mark a line's price as above average. Real data decides when there is a range;
 * otherwise the line's own isHighPrice flag (from the sample, or from Claude) stands.
 */
export function isAboveTypical(item: QuoteItem, vehicle?: string | null) {
  const check = priceCheck(item, vehicle);
  return check ? check.verdict === "above" : item.isHighPrice;
}

/** Total dollars the quote is above the top of the typical ranges, over the lines that have one. */
export function overTypicalTotal(items: QuoteItem[], vehicle?: string | null) {
  return items.reduce((sum, item) => sum + (priceCheck(item, vehicle)?.overBy ?? 0), 0);
}
