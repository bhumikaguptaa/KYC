import { describe, expect, it } from "vitest";
import { PRICE_RANGES, isAboveTypical, matchJob, overTypicalTotal, priceCheck, rangesApplyTo } from "@/lib/prices";
import type { QuoteItem } from "@/lib/quote";
import { QUOTE_FIXTURE } from "@/lib/quote-fixture";
import { SAMPLE_QUOTES } from "@/lib/sample-quotes";

const line = (description: string, amount: number, isHighPrice = false): QuoteItem => ({
  index: 1,
  description,
  amount,
  canDIY: false,
  isHighPrice,
  relevantPart: null,
});

describe("PRICE_RANGES", () => {
  it("are positive, whole-dollar ranges with a source", () => {
    for (const [job, r] of Object.entries(PRICE_RANGES)) {
      expect(Number.isInteger(r.low) && Number.isInteger(r.high), job).toBe(true);
      expect(r.low > 0 && r.low < r.high, job).toBe(true);
      expect(r.source.length, job).toBeGreaterThan(0);
      expect(r.url, job).toMatch(/^https:\/\//);
    }
  });
});

describe("matchJob", () => {
  it.each([
    ["Replace the engine air filter, which is clogged with dirt and leaves", "engine_air_filter"],
    ["Replace the cabin air filter", "cabin_air_filter"],
    ["Replace the 12V battery, which failed its load test", "battery"],
    ["Flush the brake fluid, which is dark and holds too much moisture", "brake_fluid_flush"],
    ["Replace the rear brake pads", "brake_pads"],
    ["Tire rotation", "tire_rotation"],
    ["Four-wheel alignment", "wheel_alignment"],
    ["Replace all four spark plugs", "spark_plugs"],
    ["Recharge the air conditioning", "ac_recharge"],
    ["A/C recharge", "ac_recharge"],
    ["Diagnose the check-engine light", "check_engine_diagnosis"],
    ["Replace the serpentine belt, which is cracked", "serpentine_belt"],
  ])("%s -> %s", (description, job) => {
    expect(matchJob(description)).toBe(job);
  });

  it.each([
    "Rotate and balance all four tires", // balancing costs extra
    "Replace the front brake pads and rotors", // rotors cost extra
    "Clean the battery terminals", // not a battery replacement
    "Top up the washer fluid with a winter blend", // no published range
    "Replace both front wiper blades",
    "Remove and replace the cracked air intake duct",
  ])("leaves %s unmatched", (description) => {
    expect(matchJob(description)).toBeNull();
  });
});

describe("priceCheck", () => {
  it("calls a price above, within or below the range", () => {
    expect(priceCheck(line("Replace engine air filter", 95))).toMatchObject({ verdict: "above", overBy: 11 });
    expect(priceCheck(line("Replace engine air filter", 75))).toMatchObject({ verdict: "typical", overBy: 0 });
    expect(priceCheck(line("Replace engine air filter", 40))).toMatchObject({ verdict: "below", overBy: 0 });
  });

  it("counts the edges of the range as typical", () => {
    expect(priceCheck(line("Replace engine air filter", 67))?.verdict).toBe("typical");
    expect(priceCheck(line("Replace engine air filter", 84))?.verdict).toBe("typical");
  });

  it("is null for a job with no range", () => {
    expect(priceCheck(line("Replace both front wiper blades", 500))).toBeNull();
  });

  it("only applies Civic ranges to a Civic, or when no car is given", () => {
    expect(rangesApplyTo(null)).toBe(true);
    expect(rangesApplyTo("2018 Honda Civic Type R")).toBe(true);
    expect(rangesApplyTo("2015 Ford F-150")).toBe(false);
    expect(priceCheck(line("Replace engine air filter", 95), "2015 Ford F-150")).toBeNull();
  });
});

describe("isAboveTypical", () => {
  it("uses the data when there is a range, and the line's own flag when not", () => {
    expect(isAboveTypical(line("Replace engine air filter", 75, true))).toBe(false);
    expect(isAboveTypical(line("Replace both front wiper blades", 75, true))).toBe(true);
    expect(isAboveTypical(line("Replace both front wiper blades", 75, false))).toBe(false);
  });

  it("agrees with every hand-set flag in the samples, so the demo looks the same", () => {
    for (const quote of [...SAMPLE_QUOTES, QUOTE_FIXTURE]) {
      for (const item of quote) expect(isAboveTypical(item), item.description).toBe(item.isHighPrice);
    }
  });
});

describe("overTypicalTotal", () => {
  it("adds up how far each line is above its range", () => {
    // air filter $95 is $11 over $84; battery $289 is $40 over $249; wipers have no range.
    const items = [line("Replace engine air filter", 95), line("Replace the 12V battery", 289), line("Replace wiper blades", 500)];
    expect(overTypicalTotal(items)).toBe(51);
  });

  it("is 0 for an empty quote", () => {
    expect(overTypicalTotal([])).toBe(0);
  });
});
