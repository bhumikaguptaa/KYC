"use client";

import { useEffect, useRef } from "react";
import { CameraControls, CameraControlsImpl } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Box3, Vector3, type PerspectiveCamera } from "three";
import { CAMERA, EXPLORE, partById, type Vec3 } from "@/lib/car";
import { useScene } from "@/lib/scene-context";

/** On a tall screen the car is wider than the view, so every pose backs away from its target. */
const PORTRAIT_PULLBACK = 1.45;

function pullBack(pos: Vec3, target: Vec3, k: number): Vec3 {
  return [0, 1, 2].map((i) => target[i] + (pos[i] - target[i]) * k) as Vec3;
}

const { ACTION } = CameraControlsImpl;

/**
 * How far the point the camera looks at may be moved by a pan: a box a little larger than the
 * car. Without it, a pan could push the car off screen with no way to find it again.
 */
const PAN_LIMITS = new Box3(new Vector3(-1.6, 0.15, -2.8), new Vector3(1.6, 1.7, 2.8));

/** The same for a taken-out part: it floats above the car, outside PAN_LIMITS, so it gets its own box. */
const EXPLORE_PAN_LIMITS = new Box3().setFromCenterAndSize(
  new Vector3(...EXPLORE.point),
  new Vector3(EXPLORE.size * 2, EXPLORE.size * 2, EXPLORE.size * 2),
);

/**
 * Camera pose for exploring a taken-out part: looks at the explore point from EXPLORE.view,
 * far enough back that the part fits the screen whichever way round the screen is.
 */
function explorePose(fovDeg: number, aspect: number): { position: Vec3; target: Vec3 } {
  const half = (fovDeg * Math.PI) / 360;
  const fitHalf = Math.min(half, Math.atan(Math.tan(half) * aspect));
  const radius = (EXPLORE.size * Math.sqrt(3)) / 2; // bounding sphere of an EXPLORE.size cube
  // Phones get a little more margin: the part shares the screen with the sheet below it.
  const distance = (radius * (aspect < 1 ? 1.3 : 1.15)) / Math.sin(fitHalf);
  const [dx, dy, dz] = EXPLORE.view;
  const len = Math.hypot(dx, dy, dz);
  const [px, pz] = [EXPLORE.point[0], EXPLORE.point[2]];
  // On a tall phone screen the part sheet covers the bottom, so aim below the part to sit it in
  // the upper half of the screen (0.1 x distance is roughly a sixth of the screen height).
  const py = EXPLORE.point[1] - (aspect < 1 ? distance * 0.1 : 0);
  return {
    position: [px + (dx / len) * distance, py + (dy / len) * distance, pz + (dz / len) * distance],
    target: [px, py, pz],
  };
}

/** One camera for the whole app. Views are poses; every change is an eased fly-to, never a cut. */
export function CameraRig() {
  const ref = useRef<CameraControls>(null);
  const { view, selected, recenterKey } = useScene();
  const camera = useThree((st) => st.camera) as PerspectiveCamera;
  const aspect = useThree((st) => st.size.width / Math.max(1, st.size.height));
  const k = aspect < 0.9 ? PORTRAIT_PULLBACK : 1;
  const exploring = view === "explore";
  // The turntables (start screen, taken-out part) stop once the user takes hold of the camera.
  const userMoved = useRef(false);

  // Touch gestures: one finger turns the car, two fingers pinch to zoom and drag to move sideways
  // or up and down, three fingers also move. Mouse: left drag turns, right drag moves, wheel zooms.
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.touches.one = ACTION.TOUCH_ROTATE;
    c.touches.two = ACTION.TOUCH_DOLLY_TRUCK;
    c.touches.three = ACTION.TOUCH_TRUCK;
    const onControl = () => (userMoved.current = true);
    c.addEventListener("controlstart", onControl);
    return () => c.removeEventListener("controlstart", onControl);
  }, []);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    userMoved.current = false;
    c.setBoundary(exploring ? EXPLORE_PAN_LIMITS : PAN_LIMITS);
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
    // explorePose already frames the part for the screen shape, so it skips the portrait pull-back.
    if (exploring) {
      const e = explorePose(camera.fov, aspect);
      void c.setLookAt(...e.position, ...e.target, true);
    } else void c.setLookAt(...pullBack(pos, target, k), ...target, true);
  }, [view, selected, camera, aspect, k, exploring, recenterKey]);

  // Slow turntable on the start screen, and around a taken-out part, until the user moves the camera.
  useFrame((_, dt) => {
    const c = ref.current;
    if (!c || userMoved.current) return;
    const step = Math.min(dt, 0.05);
    if (view === "start") void c.rotate(step * 0.06, 0, false);
    if (exploring) void c.rotate(step * 0.25, 0, false);
  });

  return (
    <CameraControls
      ref={ref}
      makeDefault
      // Exploring a part is hands-on: snappier response, zoom toward the cursor / pinch point,
      // get close, and look at it from below as well as above.
      smoothTime={exploring ? 0.3 : 0.55}
      draggingSmoothTime={exploring ? 0.08 : 0.12}
      dollyToCursor={exploring}
      dollySpeed={exploring ? 0.7 : 0.6}
      truckSpeed={exploring ? 1.2 : 2}
      boundaryFriction={0.25}
      // The part is about EXPLORE.size across, so 0.5 stops just short of its surface.
      minDistance={exploring ? 0.5 : 0.9}
      maxDistance={exploring ? 3.5 : 11 * k}
      minPolarAngle={exploring ? 0.05 : 0.15}
      maxPolarAngle={exploring ? Math.PI * 0.8 : Math.PI * 0.47}
    />
  );
}
