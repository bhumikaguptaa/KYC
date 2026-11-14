"use client";

import { useEffect, useRef } from "react";
import { CameraControls, CameraControlsImpl } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Box3, Vector3 } from "three";
import { CAMERA, partById, type Vec3 } from "@/lib/car";
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

/** One camera for the whole app. Views are poses; every change is an eased fly-to, never a cut. */
export function CameraRig() {
  const ref = useRef<CameraControls>(null);
  const { view, selected } = useScene();
  const userMoved = useRef(false);
  const portrait = useThree((st) => st.size.width / st.size.height < 0.9);
  const k = portrait ? PORTRAIT_PULLBACK : 1;

  // Touch gestures: one finger turns the car, two fingers pinch to zoom and drag to move sideways
  // or up and down, three fingers also move. Mouse: left drag turns, right drag moves, wheel zooms.
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.touches.one = ACTION.TOUCH_ROTATE;
    c.touches.two = ACTION.TOUCH_DOLLY_TRUCK;
    c.touches.three = ACTION.TOUCH_TRUCK;
    c.setBoundary(PAN_LIMITS);
    // Once the user takes hold of the camera, the start-screen turntable stops fighting them.
    const onControl = () => (userMoved.current = true);
    c.addEventListener("controlstart", onControl);
    return () => c.removeEventListener("controlstart", onControl);
  }, []);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    userMoved.current = false;
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
    void c.setLookAt(...pullBack(pos, target, k), ...target, true);
  }, [view, selected, k]);

  // Slow turntable on the start screen only, until the user moves the camera.
  useFrame((_, dt) => {
    if (view === "start" && !userMoved.current && ref.current) void ref.current.rotate(Math.min(dt, 0.05) * 0.06, 0, false);
  });

  return (
    <CameraControls
      ref={ref}
      makeDefault
      smoothTime={0.55}
      draggingSmoothTime={0.12}
      minDistance={0.9}
      maxDistance={11 * k}
      minPolarAngle={0.15}
      maxPolarAngle={Math.PI * 0.47}
      dollySpeed={0.6}
      boundaryFriction={0.25}
    />
  );
}
