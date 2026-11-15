import type { QuoteItem } from "./quote";

/**
 * Five made-up repair quotes. Uploading a PDF shows one of these: the PDF itself is not read
 * (see submitQuote in lib/quote-client.ts).
 *
 * Each quote has one to three do-it-yourself lines and some lines that are not. The rules the app
 * relies on hold in every one: canDIY is true only for a part with status "diy" in lib/car.ts.
 */
export const SAMPLE_QUOTES: QuoteItem[][] = [
  // 1. The quote in sample-quote.md (Lakeside Auto Care). Two do-it-yourself lines.
  [
    { index: 1, description: "Replace the engine air filter, which is clogged with dirt and leaves", amount: 95, canDIY: true, isHighPrice: true, relevantPart: "air_filter_box" },
    { index: 2, description: "Replace both front wiper blades, which streak and chatter", amount: 72, canDIY: true, isHighPrice: false, relevantPart: "wiper" },
    { index: 3, description: "Flush the brake fluid, which is dark and holds too much moisture", amount: 189, canDIY: false, isHighPrice: false, relevantPart: "brake_fluid_reservoir" },
    { index: 4, description: "Rotate and balance all four tires", amount: 79, canDIY: false, isHighPrice: false, relevantPart: null },
    { index: 5, description: "Remove and replace the cracked air intake duct", amount: 265, canDIY: false, isHighPrice: false, relevantPart: "intake_duct" },
  ],
  // 2. Winter check. Three do-it-yourself lines.
  [
    { index: 1, description: "Replace the 12V battery, which failed its load test", amount: 289, canDIY: true, isHighPrice: true, relevantPart: "battery" },
    { index: 2, description: "Top up the washer fluid with a winter blend", amount: 24, canDIY: true, isHighPrice: true, relevantPart: "washer_fluid_cap" },
    { index: 3, description: "Top up the coolant, which sits below the MIN mark", amount: 48, canDIY: true, isHighPrice: false, relevantPart: "coolant_reservoir" },
    { index: 4, description: "Replace the front brake pads and rotors", amount: 540, canDIY: false, isHighPrice: false, relevantPart: null },
    { index: 5, description: "Four-wheel alignment", amount: 129, canDIY: false, isHighPrice: false, relevantPart: null },
  ],
  // 3. Engine service. One do-it-yourself line.
  [
    { index: 1, description: "Top up the engine oil, which is one quart low", amount: 32, canDIY: true, isHighPrice: false, relevantPart: "oil_fill_cap" },
    { index: 2, description: "Replace all four spark plugs", amount: 310, canDIY: false, isHighPrice: true, relevantPart: "engine_cover" },
    { index: 3, description: "Find the cause of the fuse that keeps blowing for the 12V socket", amount: 95, canDIY: false, isHighPrice: false, relevantPart: "fuse_box" },
    { index: 4, description: "Replace the cabin air filter", amount: 85, canDIY: false, isHighPrice: true, relevantPart: null },
  ],
  // 4. Brakes and comfort. Two do-it-yourself lines.
  [
    { index: 1, description: "Replace both front wiper blades", amount: 58, canDIY: true, isHighPrice: false, relevantPart: "wiper" },
    { index: 2, description: "Replace the 12V battery, which is five years old and slow to start the car", amount: 245, canDIY: true, isHighPrice: false, relevantPart: "battery" },
    { index: 3, description: "Flush the brake fluid", amount: 210, canDIY: false, isHighPrice: true, relevantPart: "brake_fluid_reservoir" },
    { index: 4, description: "Replace the rear brake pads", amount: 280, canDIY: false, isHighPrice: false, relevantPart: null },
    { index: 5, description: "Recharge the air conditioning", amount: 189, canDIY: false, isHighPrice: false, relevantPart: null },
  ],
  // 5. Check-engine visit. Two do-it-yourself lines.
  [
    { index: 1, description: "Diagnose the check-engine light", amount: 165, canDIY: false, isHighPrice: false, relevantPart: "engine_cover" },
    { index: 2, description: "Replace the engine air filter", amount: 64, canDIY: true, isHighPrice: false, relevantPart: "air_filter_box" },
    { index: 3, description: "Top up the coolant and check the level again", amount: 55, canDIY: true, isHighPrice: true, relevantPart: "coolant_reservoir" },
    { index: 4, description: "Replace the serpentine belt, which is cracked", amount: 230, canDIY: false, isHighPrice: false, relevantPart: null },
  ],
];
