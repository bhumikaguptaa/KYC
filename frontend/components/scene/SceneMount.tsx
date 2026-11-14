"use client";

import dynamic from "next/dynamic";

// three.js needs the browser: load the canvas on the client only, and only once.
const Scene = dynamic(() => import("./Scene"), { ssr: false });

export function SceneMount() {
  return (
    <div className="fixed inset-0 touch-none" aria-hidden>
      <Scene />
    </div>
  );
}
