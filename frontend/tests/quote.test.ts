import { describe, expect, it } from "vitest";
import { PARTS } from "@/lib/car";
import { PART_IDS, isPartId, quoteGlows, quoteStatus, type QuoteItem } from "@/lib/quote";
import { QUOTE_FIXTURE } from "@/lib/quote-fixture";
import { quoteFileProblem } from "@/lib/quote-client";
import { SAMPLE_QUOTES, isSampleQuote } from "@/lib/sample-quotes";
import { GUIDES } from "@/lib/guides";

const line = (over: Partial<QuoteItem>): QuoteItem => ({
  index: 1,
  description: "A repair",
  amount: 100,
  canDIY: false,
  isHighPrice: false,
  relevantPart: null,
  ...over,
});

describe("PART_IDS", () => {
  it("lists exactly the parts in lib/car.ts", () => {
    expect([...PART_IDS].sort()).toEqual(PARTS.map((p) => p.id).sort());
  });

  it("recognises part ids and nothing else", () => {
    expect(isPartId("battery")).toBe(true);
    expect(isPartId("flux_capacitor")).toBe(false);
    expect(isPartId(null)).toBe(false);
  });
});

describe("quoteStatus", () => {
  it("is diy for a do-it-yourself line on a diy part", () => {
    expect(quoteStatus(line({ canDIY: true, relevantPart: "battery" }))).toBe("diy");
  });

  it("is careful for a part marked advanced", () => {
    expect(quoteStatus(line({ relevantPart: "fuse_box" }))).toBe("careful");
  });

  it("is mechanic for a shop part, and for a line with no part", () => {
    expect(quoteStatus(line({ relevantPart: "brake_fluid_reservoir" }))).toBe("mechanic");
    expect(quoteStatus(line({ relevantPart: null }))).toBe("mechanic");
  });

  it("never says diy without a part, even if canDIY is set", () => {
    expect(quoteStatus(line({ canDIY: true, relevantPart: null }))).toBe("mechanic");
  });
});

describe("quoteGlows", () => {
  it("lights each quoted part in its verdict's colour", () => {
    expect(quoteGlows(QUOTE_FIXTURE)).toEqual({
      air_filter_box: "diy",
      battery: "diy",
      wiper: "diy",
      brake_fluid_reservoir: "shop",
      fuse_box: "advanced",
    });
  });

  it("gives a part on several lines its easiest verdict", () => {
    const items = [line({ relevantPart: "battery" }), line({ index: 2, canDIY: true, relevantPart: "battery" })];
    expect(quoteGlows(items)).toEqual({ battery: "diy" });
  });

  it("is empty for an empty quote", () => {
    expect(quoteGlows([])).toEqual({});
  });
});

describe("quoteFileProblem", () => {
  it("accepts a PDF up to 4 MB", () => {
    expect(quoteFileProblem({ type: "application/pdf", size: 1000 })).toBeNull();
    expect(quoteFileProblem({ type: "application/pdf", size: 4 * 1024 * 1024 })).toBeNull();
  });

  it("accepts a .pdf with no type (some phones send none)", () => {
    expect(quoteFileProblem({ type: "", size: 1000, name: "quote.PDF" })).toBeNull();
  });

  it("rejects other files, empty files and files over 4 MB", () => {
    expect(quoteFileProblem({ type: "image/png", size: 1000 })).toMatch(/not a PDF/);
    expect(quoteFileProblem({ type: "application/pdf", size: 0 })).toMatch(/empty/);
    expect(quoteFileProblem({ type: "application/pdf", size: 4 * 1024 * 1024 + 1 })).toMatch(/larger than 4 MB/);
  });
});

describe("sample quotes and fixture", () => {
  const all = [...SAMPLE_QUOTES, QUOTE_FIXTURE];

  it("only say do it yourself on parts marked diy", () => {
    for (const quote of all) {
      for (const item of quote) {
        if (!item.canDIY) continue;
        expect(PARTS.find((p) => p.id === item.relevantPart)?.status, item.description).toBe("diy");
      }
    }
  });

  it("number their lines 1, 2, 3 and use whole, non-negative dollars", () => {
    for (const quote of all) {
      expect(quote.map((i) => i.index)).toEqual(quote.map((_, n) => n + 1));
      for (const item of quote) expect(Number.isInteger(item.amount) && item.amount >= 0).toBe(true);
    }
  });

  it("are recognised as samples, and a real quote is not", () => {
    for (const quote of all) expect(isSampleQuote(quote)).toBe(true);
    expect(isSampleQuote([line({ description: "Replace timing belt and water pump" })])).toBe(false);
    expect(isSampleQuote([])).toBe(false);
  });
});

describe("guides", () => {
  it("exist for every diy part, and only for diy parts", () => {
    const diy = PARTS.filter((p) => p.status === "diy").map((p) => p.id).sort();
    expect(Object.keys(GUIDES).sort()).toEqual(diy);
  });
});
