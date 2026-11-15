import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SceneMount } from "@/components/scene/SceneMount";
import { SerwistProvider } from "@serwist/next/react";
import { LoadingVeil } from "@/components/ui/LoadingVeil";
import { MotionProvider } from "@/components/ui/MotionProvider";
import { PwaChrome } from "@/components/ui/PwaChrome";
import { SceneProvider } from "@/lib/scene-context";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"], weight: ["400", "500", "600"] });
// Mono for anything read like an instrument: the VIN, the model year, gauge labels.
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], weight: ["400", "500"] });

// iOS launch images: shown while the installed app starts, instead of a blank screen.
// [CSS width, CSS height, pixel ratio] for each iPhone screen size; files are in public/splash.
const IPHONE_SCREENS = [
  [440, 956, 3],
  [430, 932, 3],
  [428, 926, 3],
  [414, 896, 3],
  [402, 874, 3],
  [393, 852, 3],
  [390, 844, 3],
  [375, 812, 3],
  [414, 896, 2],
  [375, 667, 2],
] as const;
const startupImage = IPHONE_SCREENS.map(([w, h, r]) => ({
  url: `/splash/${w * r}x${h * r}.png`,
  media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)`,
}));

export const metadata: Metadata = {
  title: "KYC — Know Your Car",
  description: "See your exact car in 3D, understand your repair slip, and fix what you safely can yourself.",
  applicationName: "KYC",
  formatDetection: { telephone: false, email: false, address: false },
  appleWebApp: { capable: true, title: "KYC", statusBarStyle: "black-translucent", startupImage },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="h-full overflow-hidden bg-ink text-chalk select-none">
        {/* The service worker (offline support). Off in dev so stale caches never confuse us.
            PwaChrome registers it once the car has loaded, so it never slows the first visit. */}
        <SerwistProvider
          swUrl="/sw.js"
          register={false}
          disable={process.env.NODE_ENV !== "production"}
          cacheOnNavigation={false}
          reloadOnOnline={false}
        >
        <SceneProvider>
          <MotionProvider>
            {/* The 3D scene lives here, outside the pages, so navigation never reloads it. */}
            <SceneMount />
            <LoadingVeil />
            <PwaChrome />
            {/* Pages are HTML panels floating over the car; only their own panels take clicks. */}
            <main className="pointer-events-none fixed inset-0 z-10 safe-area">{children}</main>
          </MotionProvider>
        </SceneProvider>
        </SerwistProvider>
        <Analytics />
      </body>
    </html>
  );
}
