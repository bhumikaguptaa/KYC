# Tech stack

Next.js (App Router) on Vercel, React Three Fiber for 3D, and no extra state library until we prove we need one. Keep the client bundle lean: no post-processing, heavy or optional libraries load only when needed, and bundle size is measured, not guessed.

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15+ (App Router), TypeScript | One project for UI, API routes and deploy; built-in metadata and manifest support |
| Hosting | Vercel | Zero-config Next.js deploys; HTTPS, which home-screen install requires |
| 3D engine | three.js + @react-three/fiber | Standard for web 3D; React components for scene parts |
| 3D helpers | @react-three/drei: CameraControls, useGLTF, Environment, ContactShadows, Html | Smooth camera fly-to, model loading, studio lighting, labels pinned to parts. Import named helpers only so unused ones tree-shake out |
| Look and highlights | No post-processing. AO baked into textures in Blender, renderer AgX tone mapping, renderer `antialias: true`, emissive glow on the selected part | Studio look without an effect composer: smaller bundle and much less GPU work on phones |
| Custom shaders | Small GLSL: X-ray fresnel glass, wireframe-to-paint reveal | The two signature effects |
| 3D motion | maath easing inside useFrame (hood, doors, parts, exploded view) | Frame-rate-independent, interruptible animation; already a drei dependency |
| UI motion | Motion (Framer Motion) springs via `LazyMotion` + `m` components | Tesla-like physical feel for panels and sheets at a fraction of the full bundle size |
| Styling | Tailwind CSS v4, Geist font | Speed and one consistent type system; load only the Geist weights used |
| State | React context in the root layout + URL (route and search params); refs for anything per-frame | Enough for one car; add Zustand only if context re-renders hurt frame rate |
| Installable app | app/manifest.ts + icons + appleWebApp metadata (iOS) | Opens full-screen from the home screen, no browser bar |
| Offline and updates | Serwist (`@serwist/next` + `@serwist/cli`): `app/sw.ts` is built to `public/sw.js` by `serwist build` after `next build`. Precaches the app shell, pages, fonts and the car model; stale-while-revalidate for VIN and recall lookups | The installed app opens and shows the 3D car with no network. Service worker only: adds almost nothing to the client bundle. `next-pwa` is unmaintained |
| VIN entry | A VIN entry field plus a demo-VIN button that fills it in automatically. No VIN scanning in the demo | Fastest path through the demo; no camera or barcode library needed |
| VIN data | NHTSA vPIC DecodeVinValuesExtended (docs) | Free, no key, real data |
| Recalls | NHTSA api.nhtsa.gov/recalls/recallsByVehicle?make=&model=&modelYear= (example) | Free, keyless, real campaigns |
| Slip reading | Claude vision via @anthropic-ai/sdk in an API route, tool-use JSON output restricted to our part IDs | Reads messy slips; cannot invent parts outside our list. Server-only, no client bundle cost |
| Model pipeline | @gltf-transform/cli optimize (meshopt + WebP textures) with `--join false --flatten false` | About 20 MB down to a few MB, loads fast on phones. The flags keep each clickable part as its own named mesh instead of merging them |
| Bundle analysis | @next/bundle-analyzer (dev dependency) | Shows what actually ships to the phone so bloat is caught early |
