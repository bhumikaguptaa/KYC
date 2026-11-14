import type { MetadataRoute } from "next";

// Makes KYC installable: "Add to Home Screen" opens it full screen with our icon and colours.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KYC — Know Your Car",
    short_name: "KYC",
    description: "Your car in 3D, your repair slip explained, and what you can fix yourself.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0b",
    theme_color: "#0a0a0b",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
