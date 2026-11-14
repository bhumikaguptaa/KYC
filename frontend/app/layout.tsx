import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { SceneMount } from "@/components/scene/SceneMount";
import { LoadingVeil } from "@/components/ui/LoadingVeil";
import { MotionProvider } from "@/components/ui/MotionProvider";
import { SceneProvider } from "@/lib/scene-context";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "KYC — Know Your Car",
  description: "See your exact car in 3D, understand your repair slip, and fix what you safely can yourself.",
  applicationName: "KYC",
  appleWebApp: { capable: true, title: "KYC", statusBarStyle: "black-translucent" },
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
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="h-full overflow-hidden bg-[#0a0a0b] text-white">
        <SceneProvider>
          <MotionProvider>
            {/* The 3D scene lives here, outside the pages, so navigation never reloads it. */}
            <SceneMount />
            <LoadingVeil />
            {/* Pages are HTML panels floating over the car; only their own panels take clicks. */}
            <main className="pointer-events-none fixed inset-0 z-10 safe-area">{children}</main>
          </MotionProvider>
        </SceneProvider>
      </body>
    </html>
  );
}
