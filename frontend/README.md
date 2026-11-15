# KYC — Know Your Car (frontend)

Next.js 16 + React Three Fiber. One persistent 3D canvas lives in `app/layout.tsx`; pages are HTML panels over it.

## Setup (once)

```bash
cd frontend
npm install
npm run model        # optimizes ~/Downloads/KYC-model/KYC_civic.glb -> public/models/civic.glb
npm run dev          # http://localhost:3000
```

`npm run model` reads the Blender export from `~/Downloads/KYC-model/KYC_civic.glb`. If yours is elsewhere:
`MODEL_SRC=/path/to/KYC_civic.glb npm run model`. Commit `public/models/civic.glb` (a few MB) so teammates and Vercel get it.

Before pushing: `npm run typecheck && npm run lint && npm run build`.

## Layout

```
app/
  layout.tsx            SceneProvider + <SceneMount/> (the canvas) + panels on top
  page.tsx              Start: VIN entry, demo car, specs + recalls card
  garage/page.tsx       Garage: hood/doors/hatch/lights, X-ray, under the hood, part sheet + how-to
  quote/page.tsx        Repair quote: upload the PDF, get it back as a marked-up slip on the car
  api/quote/route.ts    Reads a quote PDF with Claude (see quote-pipeline-plan.md)
  api/vin/route.ts      NHTSA vPIC decode (wildcards allowed for the demo pattern)
  api/recalls/route.ts  NHTSA recalls by make/model/year
  manifest.ts           Add-to-home-screen
components/scene/       Scene (Canvas), Car (model rig), CameraRig, Studio, xray-material,
                        Hotspots (labels on the car: "Open hood", part lights in the bay)
components/ui/          MotionProvider (LazyMotion domMax + shared springs), LoadingVeil (bulb check),
                        VinPlate (17-character VIN readout), status (tell-tale colours), icons,
                        ModeSwitch (Outside / Under the hood / Quote, the same bar on every page)
components/quote/       QuoteUpload (password, PDF slot, reading state), QuoteSlip (the paper slip:
                        DIY/SHOP stamps, amber highlighter on high prices, tap a line to see the part)
components/guide/       PartGuide (tools + steps you tick off), VideoEmbed (loads YouTube on tap only)
lib/palette.ts          The tell-tale colours for three.js (mirrors the @theme block in globals.css)
lib/hotspots.ts         Where the on-car labels sit
lib/ui.ts               tick() haptics, useWide(), one-off hint memory
lib/car.ts              Everything about the Civic: hinges, parts, camera poses
lib/scene-context.tsx   Shared state: view, open panels, lights, x-ray, selection, glows, vehicle,
                        quote, frameOffset (a page sliding the car clear of its panels)
lib/quote.ts, guides.ts The quote contract, and one how-to guide per do-it-yourself part
```

## Design language

Every colour is a dashboard tell-tale and means what it means in a car: **green** you can do it
yourself, **amber** take care, **red** mechanic, **high-beam blue** selected / switched on. The rest
is the night-time cabin: graphite and warm white. If something is coloured, it is telling you
something. Controls always have a word next to the icon, and what you can operate is labelled on
the car itself.

## How the 3D works

- **Views are camera poses.** Pages call `setView("garage" | "engineBay" | "part" | "start")`; `CameraRig` flies there.
- **Hinges** (`HINGES` in `lib/car.ts`) rotate around the pivots set in Blender. Tap a panel in 3D or use the chips.
- **Parts** are the `P_*` meshes. Each gets its own material copy so it can glow alone. `glows` in context
  colours parts `diy` / `shop` / `select` (this is what the slip screen will drive).
- **X-ray** swaps the exterior shell to a fresnel glass shader; the cabin, engine bay, wheels and brakes stay solid.
- three.js strips dots from node names: `FK8.Hood` in Blender is `FK8Hood` in code.

## Next

1. `/slip`: upload or demo slip -> `POST /api/slip` (Claude vision, tool-use JSON limited to `PARTS` ids) -> `setGlows`.
2. `/guide/[id]`: steps, camera per step, part glow, video link, parts list.
3. Wireframe-to-paint reveal after the VIN decode.
