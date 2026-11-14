import type { Openable, Vec3 } from "./car";

/**
 * Labels pinned to the car itself ("Open hood", Tesla-style), so the thing you can operate is
 * named where it is. World space, from the model's panel bounds (see lib/car.ts for axes).
 * `normal` points out of the panel: a label fades out when its panel faces away from the camera,
 * so you never see the far door's label through the car. Front and rear door labels sit at
 * different heights so they don't overlap when the car is seen from the front corner.
 */
export type PanelSpot = { id: string; opens: Openable; label: string; position: Vec3; normal: Vec3 };

export const PANEL_SPOTS: PanelSpot[] = [
  { id: "hood", opens: "hood", label: "hood", position: [0, 1.26, 1.9], normal: [0, 1, 0.55] },
  { id: "door-fl", opens: "frontDoors", label: "front doors", position: [1.02, 1.02, 0.42], normal: [1, 0.15, 0] },
  { id: "door-fr", opens: "frontDoors", label: "front doors", position: [-1.02, 1.02, 0.42], normal: [-1, 0.15, 0] },
  { id: "door-rl", opens: "rearDoors", label: "rear doors", position: [0.99, 0.66, -0.9], normal: [1, 0.15, 0] },
  { id: "door-rr", opens: "rearDoors", label: "rear doors", position: [-0.99, 0.66, -0.9], normal: [-1, 0.15, 0] },
  { id: "hatch", opens: "hatch", label: "hatch", position: [0, 1.42, -2.42], normal: [0, 0.45, -1] },
];
