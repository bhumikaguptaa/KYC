import type { QuoteItem } from "./quote";

/**
 * A made-up quote for building and testing the quote UI without calling the API.
 * Covers every case the UI must handle: a high price, do-it-yourself lines (one of them also
 * high-priced, so both pills show), a line with no matching part, and a mechanic-only part.
 */
export const QUOTE_FIXTURE: QuoteItem[] = [
  {
    index: 1,
    description: "Replace engine air filter",
    amount: 89,
    canDIY: true,
    isHighPrice: true,
    relevantPart: "air_filter_box",
  },
  {
    index: 2,
    description: "Replace 12V battery",
    amount: 240,
    canDIY: true,
    isHighPrice: false,
    relevantPart: "battery",
  },
  {
    index: 3,
    description: "Replace front wiper blades",
    amount: 65,
    canDIY: true,
    isHighPrice: false,
    relevantPart: "wiper",
  },
  {
    index: 4,
    description: "Brake fluid flush",
    amount: 320,
    canDIY: false,
    isHighPrice: true,
    relevantPart: "brake_fluid_reservoir",
  },
  {
    index: 5,
    description: "Tire rotation and balance",
    amount: 60,
    canDIY: false,
    isHighPrice: false,
    relevantPart: null,
  },
  {
    index: 6,
    description: "Diagnose intermittent fuse fault",
    amount: 150,
    canDIY: false,
    isHighPrice: false,
    relevantPart: "fuse_box",
  },
];
