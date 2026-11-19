# Know Your Car (KYC)

**Understand your car before you pay the price.**

KYC helps young drivers make sense of a mechanic's quote. Enter your VIN, see your exact car in interactive 3D, check open recalls, and go through your repair quote line by line. You can see which repairs are overpriced, which ones you can do yourself, and where each part sits on your car.

Built in 54 hours at **Techstars Startup Weekend KU (Nov 2026)**.

Website demo: https://kyc-hazel.vercel.app/ 
## Features

- **VIN decoding.** Decodes any 17-character VIN with the free NHTSA vPIC API. A demo button fills in a wildcard Civic VIN, so no real VIN is needed.
- **Recall check.** Pulls open recall campaigns for your make, model and year from the NHTSA Recalls API.
- **Interactive 3D car.** A Honda Civic model built with React Three Fiber, with clickable hotspots, camera fly-to animations and a custom X-ray shader to see inside the car.
- **Quote breakdown.** Lists each line of a repair quote with its price, flags high prices and marks DIY-friendly repairs. Each line links to its part on the 3D car.
- **DIY guides.** Step-by-step how-tos, a tool list and an embedded video for each part.
- **Installable PWA.** Opens full-screen from the home screen and works offline. The app shell and the 3D model are precached with Serwist.

## Tech stack

| Layer | Tools |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| 3D | three.js, @react-three/fiber, @react-three/drei, custom GLSL shaders, maath easing |
| UI | Tailwind CSS v4, Motion |
| Data | NHTSA vPIC (VIN), NHTSA Recalls API |
| AI | Anthropic SDK (Claude), zod output schemas, server-only |
| PWA | Serwist service worker, web app manifest |
| 3D asset pipeline | glTF-Transform (meshopt + WebP compression) |
| Hosting | Vercel, with Vercel Analytics |

## Project structure

```
frontend/
  app/
    api/vin/        VIN decoding route (NHTSA vPIC)
    api/recalls/    Recall lookup route (NHTSA)
    garage/         3D car view
    quote/          Quote upload and breakdown
    sw.ts           Service worker
  components/
    scene/          3D scene: car, camera rig, hotspots, X-ray material
    quote/          Quote upload and quote slip
    guide/          DIY guides, tool lists, videos
    ui/             VIN plate, mode switch, PWA prompts
  lib/
    quote.ts        Shared quote types (QuoteItem, QuoteResponse)
    sample-quotes.ts Demo quotes
    guides.ts       DIY guide content
    server/ai.ts    Claude client, password gate, structured logging
```

## Getting started

```bash
cd frontend
cp .env.example .env    # fill in the values below
npm install
npm run dev             # http://localhost:3000
```

**Environment variables** (server-only, never prefix with `NEXT_PUBLIC_`):

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API key |
| `SUPERSECRETPASSWORD` | Password a user must send before the app spends API credit |

**Other scripts**

```bash
npm run build       # Next.js build + service worker
npm run typecheck   # TypeScript check
npm run lint        # ESLint
npm run analyze     # Bundle size report
npm run model       # Compress the 3D car model (about 20 MB down to a few MB)
```

## Current demo status

- The demo uses five sample quotes from `lib/sample-quotes.ts`, so it works offline with no API cost. The PDF quote reader is in the git history and will return for the pilot.
- One car model (Honda Civic) with 11 clickable parts.

## Roadmap

- Live PDF quote reading 
- Local fair-price ranges for each repair
- More car models
- Saved quotes and family sharing
