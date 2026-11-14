"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { AgXToneMapping } from "three";
import { CAMERA } from "@/lib/car";
import { Car } from "./Car";
import { CameraRig } from "./CameraRig";
import { Studio } from "./Studio";

/** The single persistent 3D canvas. Mounted once in the root layout; routes never unmount it. */
export default function Scene() {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ fov: 32, near: 0.1, far: 80, position: CAMERA.start.position }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = AgXToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
    >
      <Studio />
      <Suspense fallback={null}>
        <Car />
      </Suspense>
      <CameraRig />
    </Canvas>
  );
}
