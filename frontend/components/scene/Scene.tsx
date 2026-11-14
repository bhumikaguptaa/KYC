"use client";

import { Fragment, Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { AgXToneMapping } from "three";
import { CAMERA } from "@/lib/car";
import { Car } from "./Car";
import { CameraRig } from "./CameraRig";
import { Studio } from "./Studio";

/** Phones have 3x screens. Past 1.5x the extra pixels cost a lot of GPU and no one can see them. */
const TOUCH_DEVICE = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
const DPR: [number, number] = TOUCH_DEVICE ? [1, 1.5] : [1, 2];

/** The single persistent 3D canvas. Mounted once in the root layout; routes never unmount it. */
export default function Scene() {
  // Stop drawing while the app is in the background or the screen is off: saves battery.
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const update = () => setVisible(document.visibilityState === "visible");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  // iOS can drop the GL context while the installed app is in the background. three.js restores
  // models and textures by itself, but the lighting and the ground shadow are baked once
  // (frames={1}) and are lost with the context, so the scene contents remount to re-bake them.
  const [contextEpoch, setContextEpoch] = useState(0);

  return (
    <Canvas
      dpr={DPR}
      frameloop={visible ? "always" : "never"}
      camera={{ fov: 32, near: 0.1, far: 80, position: CAMERA.start.position }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = AgXToneMapping;
        gl.toneMappingExposure = 1.05;
        const canvas = gl.domElement;
        // Cancelling "lost" tells the browser we want the context back.
        canvas.addEventListener("webglcontextlost", (e) => e.preventDefault());
        canvas.addEventListener("webglcontextrestored", () => setContextEpoch((n) => n + 1));
      }}
    >
      <Fragment key={contextEpoch}>
        <Studio />
        <Suspense fallback={null}>
          <Car />
        </Suspense>
      </Fragment>
      <CameraRig />
    </Canvas>
  );
}
