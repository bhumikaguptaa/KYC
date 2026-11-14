"use client";

import { useEffect, useRef } from "react";
import { CameraControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import type { PerspectiveCamera } from "three";
import { CAMERA, EXPLORE, partById, type Vec3 } from "@/lib/car";
import { useScene } from "@/lib/scene-context";

/**
 * Camera pose for exploring a taken-out part: looks at the explore point from EXPLORE.view,
 * far enough back that the part fits the screen whichever way round the screen is.
 */
function explorePose(fovDeg: number, aspect: number): { position: Vec3; target: Vec3 } {
  const half = (fovDeg * Math.PI) / 360;
  const fitHalf = Math.min(half, Math.atan(Math.tan(half) * aspect));
  const radius = (EXPLORE.size * Math.sqrt(3)) / 2; // bounding sphere of an EXPLORE.size cube
  const distance = (radius * 1.15) / Math.sin(fitHalf);
  const [dx, dy, dz] = EXPLORE.view;
  const len = Math.hypot(dx, dy, dz);
  const [px, pz] = [EXPLORE.point[0], EXPLORE.point[2]];
  // On a tall phone screen the part sheet covers the bottom, so aim a little below the part
  // to sit it in the upper half of the screen.
  const py = EXPLORE.point[1] - (aspect < 1 ? radius * 0.55 : 0);
  return {
    position: [px + (dx / len) * distance, py + (dy / len) * distance, pz + (dz / len) * distance],
    target: [px, py, pz],
  };
}

/** One camera for the whole app. Views are poses; every change is an eased fly-to, never a cut. */
export function CameraRig() {
  const ref = useRef<CameraControls>(null);
  const { view, selected } = useScene();
  const camera = useThree((st) => st.camera) as PerspectiveCamera;
  const aspect = useThree((st) => st.size.width / Math.max(1, st.size.height));
  // The explore turntable stops for good once the user grabs the camera.
  const idleRef = useRef(true);

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
    if (view === "explore") ({ position: pos, target } = explorePose(camera.fov, aspect));
    idleRef.current = true;
    void c.setLookAt(...pos, ...target, true);
  }, [view, selected, camera, aspect]);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const onGrab = () => {
      idleRef.current = false;
    };
    c.addEventListener("controlstart", onGrab);
    return () => c.removeEventListener("controlstart", onGrab);
  }, []);

  // Slow turntable on the start screen, and around a taken-out part until the user takes over.
  useFrame((_, dt) => {
    const c = ref.current;
    if (!c) return;
    if (view === "start") void c.rotate(dt * 0.06, 0, false);
    if (view === "explore" && idleRef.current) void c.rotate(dt * 0.25, 0, false);
  });

  const exploring = view === "explore";
  return (
    <CameraControls
      ref={ref}
      makeDefault
      smoothTime={0.55}
      draggingSmoothTime={0.12}
      // Exploring a part: get close, and look at it from below as well as above.
      minDistance={exploring ? 0.3 : 0.9}
      maxDistance={exploring ? 4 : 11}
      minPolarAngle={exploring ? 0.05 : 0.15}
      maxPolarAngle={exploring ? Math.PI * 0.8 : Math.PI * 0.47}
      dollySpeed={0.6}
      truckSpeed={0}
    />
  );
}
