/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, ExpirationPlugin, NetworkOnly, Serwist, StaleWhileRevalidate } from "serwist";

// The service worker: makes the installed app open and show the car with no network.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

const DAY = 24 * 60 * 60;

const serwist = new Serwist({
  // App shell, icons and the car model, listed at build time (see serwist.config.mjs).
  // If the browser evicted the cache, a precached URL falls back to the network and is re-stored.
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    cleanupOutdatedCaches: true,
    // /garage?view=bay&part=battery&guide=1 must still match the precached /garage page.
    ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, /^view$/, /^part$/, /^guide$/, /^try$/],
  },
  // A new version waits until the user taps "Reload" (see PwaChrome) or closes the app.
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    // Anything that is not a GET (the slip-reading POST) always goes to the network, never a cache.
    ...(["POST", "PUT", "PATCH", "DELETE"] as const).map((method) => ({
      matcher: ({ sameOrigin, url }: { sameOrigin: boolean; url: URL }) => sameOrigin && url.pathname.startsWith("/api/"),
      method,
      handler: new NetworkOnly(),
    })),
    // VIN decode and recalls: answer from cache at once, refresh in the background.
    {
      matcher: ({ sameOrigin, url }) => sameOrigin && /^\/api\/(vin|recalls)$/.test(url.pathname),
      method: "GET",
      handler: new StaleWhileRevalidate({
        cacheName: "nhtsa-api",
        plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 30 * DAY, maxAgeFrom: "last-used" })],
      }),
    },
    // Models are versioned by filename (civic.v1.glb), so a cached copy is never stale.
    {
      matcher: ({ sameOrigin, url }) => sameOrigin && url.pathname.startsWith("/models/"),
      handler: new CacheFirst({
        cacheName: "models",
        plugins: [new ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 365 * DAY, maxAgeFrom: "last-used" })],
      }),
    },
    ...defaultCache,
  ],
  // Offline and the page is not cached: open the start screen instead of the browser error page.
  fallbacks: {
    entries: [{ url: "/", matcher: ({ request }) => request.destination === "document" }],
  },
});

serwist.addEventListeners();
