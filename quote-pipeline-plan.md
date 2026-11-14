# Quote pipeline plan

The user uploads a PDF of a repair quote. Claude reads it and returns one JSON object for each line of the quote. The app shows the lines and marks the high prices. Each do-it-yourself line links to its part in the 3D car, with a how-to guide and a video.

Two people build this in parallel. Person A builds the path from the PDF to the JSON. Person B builds the path from the JSON to the screen. The two halves meet at one shared file, `frontend/lib/quote.ts`.

## Step 0: the shared contract (both people, first)

Write this step together and merge it to `main` before any other work starts. After this step, neither person needs the other's code to make progress.

### `frontend/lib/quote.ts`

```ts
import { PARTS } from "./car";

/** The clickable parts. A quote line points at one of these, or at none. */
export const PART_IDS = PARTS.map((p) => p.id);
export type PartId = (typeof PARTS)[number]["id"];

export type QuoteItem = {
  /** 1, 2, 3 ... in the order the lines appear in the PDF */
  index: number;
  /** what needs fixing, in plain words */
  description: string;
  /** price of this line in whole US dollars */
  amount: number;
  canDIY: boolean;
  isHighPrice: boolean;
  /** null when the line matches no part in the app, for example a tire rotation */
  relevantPart: PartId | null;
};

export type QuoteResponse = { items: QuoteItem[] } | { error: string };
```

The app has 11 part IDs today:

- `air_filter_box`
- `battery`
- `washer_fluid_cap`
- `wiper`
- `coolant_reservoir`
- `oil_dipstick`
- `oil_fill_cap`
- `brake_fluid_reservoir`
- `fuse_box`
- `engine_cover`
- `intake_duct`

The list comes from `PARTS` in `lib/car.ts`, so a new part joins the enum with no other change.

For `PartId` to be a real union, declare `PARTS` with `as const satisfies Part[]`. If that change is too wide, write the 11 IDs by hand in `quote.ts`.

### Rules that both sides rely on

- The API route is `POST /api/quote`. The body is `multipart/form-data` with one field, `file`.
- A success returns status 200 and `{ items }`. A failure returns a 4xx or 5xx status and `{ error }`, where `error` is a sentence the UI can show as it is.
- `items` can be empty. That means Claude found no repair lines in the PDF.
- If `relevantPart` is null, or the part does not have the status `diy` in `lib/car.ts`, `canDIY` is false. The server enforces this rule after Claude answers.
- `amount` is a whole number of dollars. The server rounds it.

### Scene state

Add two fields to `lib/scene-context.tsx`: `quote: QuoteItem[] | null` and `setQuote`. Person A writes to them. Person B reads from them.

### Mock data

Add `frontend/lib/quote-fixture.ts` with six items. Include one high-price line, two do-it-yourself lines, one line with `relevantPart: null`, and one line for a `shop` part. Person B builds the whole UI against this file.

## Person A: PDF to JSON

Person A owns these files and no others:

- `app/api/quote/route.ts`
- `lib/quote-prompt.ts`
- `components/quote/QuoteUpload.tsx`
- `lib/quote-client.ts`

### A1. Upload component (`QuoteUpload.tsx`)

1. Show a file input with `accept="application/pdf"` and a button that is at least 44 px tall.
2. Reject a file that is not a PDF, or that is larger than 4 MB, before any upload. Vercel refuses a request body over 4.5 MB.
3. If the device is offline, show "You are offline. Connect to the internet to read a quote." Use `useOnline` from `lib/pwa.ts`.
4. Call `submitQuote(file)` from `lib/quote-client.ts`. The function posts the form and returns `QuoteItem[]`, or throws an `Error` with the server's sentence.
5. Show a busy state during the request. A request takes 10 to 30 seconds.
6. On success, call `setQuote(items)`. Person B's list appears by itself.

### A2. API route (`app/api/quote/route.ts`)

1. Read the form data and get `file`.
2. If the file is missing, is not `application/pdf`, or is over 4 MB, return 400.
3. If `ANTHROPIC_API_KEY` is not set, return 500 with a clear sentence.
4. Convert the file to base64.
5. Call Claude (see A3).
6. Apply the server rules (see A4).
7. Return `{ items }`.

Export `maxDuration = 60` from the route, so that Vercel does not stop a slow request.

### A3. The Claude call

- Use `@anthropic-ai/sdk`, which is already installed. Create the client on the server only.
- Use the model `claude-opus-5-5`.
- Send the PDF as a `document` content block with a base64 source and the media type `application/pdf`. Put it before the text block.
- Get JSON with structured outputs: `client.messages.parse` with `output_config.format`. The schema is `{ items: QuoteItem[] }`, and `relevantPart` is an enum of `PART_IDS` plus null. Claude cannot return a part outside the list.
- Do not force a tool with `tool_choice`. This model rejects a forced tool with a 400 error.
- Set `max_tokens` to 16000 and `output_config.effort` to `low`. Reading a quote is an extraction task.
- If `stop_reason` is `refusal` or `max_tokens`, or `parsed_output` is null, return 502 with "We cannot read that quote. Try a clearer PDF."

The schema helper `zodOutputFormat` needs the `zod` package, which is not installed. Add `zod` as a dependency. It runs on the server only, so it adds nothing to the client bundle.

`tech-stack.md` says "tool-use JSON output restricted to our part IDs". Structured outputs give the same restriction. Update that line in the same pull request.

### A4. Server rules after Claude answers

1. Number the items again from 1, in order.
2. Round `amount` to a whole number. Drop an item with an amount below 0.
3. If `relevantPart` is null, or the status of the part is not `diy`, set `canDIY` to false.

### A5. The prompt (`lib/quote-prompt.ts`)

The prompt tells Claude these facts:

- The car is the one in `s.vehicle` (year, make, model). The client sends these three values as extra form fields.
- Each repair or service line is one item. Skip totals, taxes, shop fees and discounts.
- The list of parts from `lib/car.ts`. Each entry has the ID, the label and the `about` text, so that Claude can match a line to a part.
- If the price is clearly above the normal US shop price for that job on that car, `isHighPrice` is true.
- If an owner with basic tools can safely do the job, `canDIY` is true.

### A6. How Person A tests alone

- Use `curl -F file=@quote.pdf http://localhost:3000/api/quote` and read the JSON.
- Make two or three sample PDFs: a clean one, a scanned one, and one that is not a quote.
- Make sure that a file that is not a PDF, a file over 4 MB, and a missing API key each return the right error.

## Person B: JSON to screen

Person B owns these files and no others:

- `app/quote/page.tsx`
- `components/quote/QuoteList.tsx` and `components/quote/QuoteCard.tsx`
- `lib/guides.ts`
- `components/guide/PartGuide.tsx` and `components/guide/VideoEmbed.tsx`
- the part sheet in `app/garage/page.tsx`

### B1. The quote page (`app/quote/page.tsx`)

1. Add a new page at `/quote`. It is a panel over the 3D car, like the start page.
2. Render Person A's `<QuoteUpload />` at the top. Until that exists, use a "Load sample quote" button that calls `setQuote` with the fixture.
3. If `quote` is not null, render `<QuoteList />` below it.
4. Add a link to `/quote` on the start card and in the garage header. The installed app has no browser back button, so add a back link on the page too.
5. On a phone, the list scrolls inside the panel. The panel respects the safe areas.

### B2. The quote card (`QuoteCard.tsx`)

The header of each card holds, from left to right:

- the index and the description
- if `isHighPrice` is true, a red pill, "High price" (use the `shop` color)
- if `canDIY` is true, a green pill, "Do it yourself" (use the `diy` color)
- if `canDIY` is true, a "View" button to the right of the green pill

The amount shows in dollars on the card. A line can have both pills. When `quote` is an empty list, show "No repair lines found in this PDF."

### B3. Glow the parts in 3D

When the quote arrives, call `setGlows`, which already exists. Give each `canDIY` part the glow `diy`, and each other matched part the glow `shop`. When the user leaves the quote or loads a new one, clear the glows.

### B4. The View button

1. On tap, go to `/garage?part=<relevantPart>&guide=1`.
2. The garage page already reads `part` from the URL. It opens the hood, selects the part, and flies the camera to it.
3. Add `guide` to `readUrl` and to the effect that writes the URL in `app/garage/page.tsx`.
4. When `guide=1`, the part sheet shows `<PartGuide />` in place of the short text.
5. If the user came from a quote, add a "Back to quote" control on the part sheet.
6. Add `/^guide$/` to `ignoreURLParametersMatching` in `app/sw.ts`. Without it, an offline device cannot match this URL to the saved page.

### B5. Guide content (`lib/guides.ts`)

```ts
export type Guide = {
  title: string;
  minutes: number;
  tools: string[];
  steps: string[];
  /** YouTube video ID, picked by a person. Never taken from the AI. */
  youtubeId: string;
};

export const GUIDES: Partial<Record<PartId, Guide>> = { ... };
```

Write one guide for each of the seven `diy` parts: `air_filter_box`, `battery`, `washer_fluid_cap`, `wiper`, `coolant_reservoir`, `oil_dipstick` and `oil_fill_cap`. Three parts already carry a `guide` slug in `lib/car.ts`. Replace that field with this file.

A person picks each video and watches it first. Claude can invent a video ID that does not exist, so the model never supplies the video.

### B6. The guide and the video (`PartGuide.tsx`, `VideoEmbed.tsx`)

1. Show the title, the time, the tools, and the numbered steps.
2. Show the video below the steps as a thumbnail with a play button.
3. Load the `iframe` only after the user taps play. This keeps the page fast and sends nothing to YouTube before the tap.
4. Use `https://www.youtube-nocookie.com/embed/<id>` with `playsinline=1`, so that the video plays inside the installed app on iOS.
5. Keep the frame at a 16:9 ratio and the full width of the sheet.
6. If the device is offline, show the steps and replace the video with "Video needs a connection."
7. The part sheet now holds more content. Make sure that it still scrolls inside itself on a phone and does not cover the bottom controls.

### B7. How Person B tests alone

- Use the fixture for every state: empty list, one line, six lines, both pills on one line.
- Open `/garage?part=battery&guide=1` directly and make sure that the guide opens.
- Test at phone width, with the phone upright and on its side.

## Order of work

| Order | Person A | Person B |
|---|---|---|
| 1 | Step 0, together | Step 0, together |
| 2 | A2, A3: route and Claude call, tested with `curl` | B1, B2: page and cards, on the fixture |
| 3 | A4, A5: server rules and prompt | B5, B6: guides and video |
| 4 | A1: upload component | B3, B4: glows and View button |
| 5 | Join: B swaps the sample button for `<QuoteUpload />` | Join: test one real PDF end to end |

Each person works on a separate branch and opens a separate pull request. The only files that both people touch are the Step 0 files, and those merge first.

## Decisions to confirm before work starts

1. A line that matches no part. This plan uses `relevantPart: null`. The other choice is to force every line onto the closest part, which gives wrong matches.
2. Who decides `canDIY`. This plan lets Claude propose it, and the server turns it off for a part that is not marked `diy`. This keeps a "Do it yourself" pill off the brake fluid.
3. How `isHighPrice` is judged. This plan uses Claude's knowledge of normal prices. It is an estimate. A fixed price table for the 11 parts is more consistent, but someone must write it.
4. The 4 MB limit. A larger PDF needs a direct upload to file storage, which is more work.
5. Privacy. A quote can contain a name, an address and a VIN. Before sending quote to claude, black out the VIN and the name and other PII. This plan sends the PDF to Claude without PII. 
