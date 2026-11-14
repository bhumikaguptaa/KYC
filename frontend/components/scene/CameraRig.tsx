"use client";

import { useEffect, useRef } from "react";
import { CameraControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { CAMERA, partById, type Vec3 } from "@/lib/car";
import { useScene } from "@/lib/scene-context";

/** One camera for the whole app. Views are poses; every change is an eased fly-to, never a cut. */
export function CameraRig() {
  const ref = useRef<CameraControls>(null);
  const { view, selected } = useScene();

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    let pos: Vec3 = CAMERA.garage.position;
    let target: Vec3 = CAMERA.garage.target;
    if (view === "start") ({ position: pos, target } = CAMERA.start);
    if (view === "engineBay") ({ position: pos, target } = CAMERA.engineBay);
    if (view === "part") {
      const p = partById(selected);
      if (p) {
        pos = p.camera;
        target = p.center;
      } else ({ position: pos, target } = CAMERA.engineBay);
    }
    void c.setLookAt(...pos, ...target, true);
  }, [view, selected]);

  // Slow turntable on the start screen only.
  useFrame((_, dt) => {
    if (view === "start" && ref.current) void ref.current.rotate(dt * 0.06, 0, false);
  });

  return (
    <CameraControls
      ref={ref}
      makeDefault
      smoothTime={0.55}
      draggingSmoothTime={0.12}
      minDistance={0.9}
      maxDistance={11}
      minPolarAngle={0.15}
      maxPolarAngle={Math.PI * 0.47}
      dollySpeed={0.6}
      truckSpeed={0}
    />
  );
}
