// Builds the service worker after `next build` (see the "build" script in package.json).
// Output: public/sw.js, a plain static file served at /sw.js.
import { generateGlobPatterns, serwist } from "@serwist/next/config";

export default serwist({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // The app shell (JS, CSS, fonts, icons) and the prerendered pages are precached by default.
  // The defaults leave out font files, so the first offline launch would fall back to a system font.
  globPatterns: [...generateGlobPatterns(".next/"), ".next/static/media/*.woff2"],
  // The car model is about 3 MB; the default limit (2 MB) would leave it out of the offline cache.
  maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
  // iOS reads launch images itself before the app runs; no need to store them twice.
  globIgnores: ["public/splash/**"],
});
