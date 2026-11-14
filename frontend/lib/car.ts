// Everything specific to the demo car lives here, so a second car is new data, not new code.
// Coordinates are three.js world space (Y up, car nose toward +Z, driver/left side toward +X).
// Node names are as three.js sees them: GLTFLoader strips dots ("FK8.Hood" -> "FK8Hood").

export type Vec3 = [number, number, number];
export type PartStatus = "diy" | "advanced" | "shop";

export type Part = {
  id: string;
  /** mesh/node names in the GLB that make up this part (prefix match handles "001" scraps) */
  nodes: string[];
  label: string;
  status: PartStatus;
  reason: string;
  about: string;
  /** world-space centre of the part, used for the label pin and the camera target */
  center: Vec3;
  /** where the camera sits when this part is focused */
  camera: Vec3;
  guide?: string;
  /**
   * Offer "Take it out" for this part. On for small do-it-yourself parts and parts whose mesh
   * comes out clean; off where the mesh drags neighbouring hoses/brackets along with it.
   */
  explorable?: boolean;
  /** short, practical facts shown while the part is taken out */
  facts?: Fact[];
};

export type Fact = { label: string; value: string };

export type Hinge = {
  node: string;
  axis: "x" | "y";
  /** opening angle in degrees, relative to the closed pose */
  angle: number;
  /**
   * World-space point on the hinge line. Taken from the source model's object origins, because
   * meshopt quantization moves every node origin to its mesh's bounding-box centre.
   */
  pivot: Vec3;
  /** other nodes that swing with this panel (separate meshes in the model) */
  carries?: string[];
};

export const MODEL_URL = "/models/civic.glb";

export const HINGES = {
  hood: [{ node: "FK8Hood", axis: "x", angle: -60, pivot: [0, 1.212, 1.161] }],
  frontDoors: [
    { node: "FK8DoorFtL", axis: "y", angle: -62, pivot: [1.273, 1.014, 1.103] },
    { node: "FK8DoorFtR", axis: "y", angle: 62, pivot: [-1.273, 1.014, 1.103] },
  ],
  rearDoors: [
    { node: "FK8DoorBkL", axis: "y", angle: -60, pivot: [1.089, 1.024, -0.245] },
    { node: "FK8DoorBkR", axis: "y", angle: 60, pivot: [-1.089, 1.024, -0.245] },
  ],
  hatch: [{ node: "FK8Tailgate", axis: "x", angle: 75, pivot: [0, 1.668, -1.428], carries: ["FK8TailgateGlass"] }],
} satisfies Record<string, Hinge[]>;

export type Openable = keyof typeof HINGES;

/** Meshes that become see-through glass in X-ray mode (the exterior shell). */
export const SHELL_NODES = [
  "Fk8Body",
  "FK8BumperBk",
  "FK8BumperFt",
  "FK8DoorBkL",
  "FK8DoorBkR",
  "FK8DoorFtL",
  "FK8DoorFtR",
  "FK8FenderL",
  "FK8FenderR",
  "FK8Hood",
  "FK8Spoiler",
  "FK8Tailgate",
  "FK8TailgateGlass",
  "FK8Windshield",
  "FK8Wipers",
  "FK8HeadlightL",
  "FK8HeadlightR",
  "FK8HeadlightGlassL",
  "FK8HeadlightGlassR",
  "FK8TaillightL",
  "FK8TaillightR",
  "FK8TaillightGlassL",
  "FK8TaillightGlassR",
];
/** Materials inside the body mesh that stay solid in X-ray (the cabin). */
export const SOLID_IN_XRAY_MATERIALS = ["FK8.Interior", "FK8.Interiorlights"];

/**
 * The model uses one lamp material ("FK8.Brakelight") for every light, so lights are picked by
 * node: lamp-material meshes inside these nodes get a front (white) or rear (red) copy.
 */
export const LAMP_MATERIAL = "FK8.Brakelight";
export const LIGHT_NODES = {
  front: ["FK8HeadlightL", "FK8HeadlightR"],
  rear: ["FK8TaillightL", "FK8TaillightR", "FK8Tailgate"],
};

export const CAMERA = {
  start: { position: [6.2, 2.2, 6.8] as Vec3, target: [0, 0.55, 0] as Vec3 },
  garage: { position: [4.9, 1.7, 5.3] as Vec3, target: [0, 0.6, 0.1] as Vec3 },
  engineBay: { position: [0.0, 2.75, 4.15] as Vec3, target: [0, 0.85, 1.75] as Vec3 },
};

/**
 * "Take it out": the selected part lifts out of the bay to this point above the nose (clear of
 * the open hood), scaled so its longest side is about `size` metres, and the camera orbits it.
 * `view` is the direction the camera looks from, relative to the point.
 */
export const EXPLORE = {
  // ~0.7 m ahead of the nose and well above it, so the open hood and body stay out of the way.
  point: [0, 1.85, 3.1] as Vec3,
  size: 0.36,
  view: [0.55, 0.4, 1] as Vec3,
};

export const PARTS: Part[] = [
  {
    id: "air_filter_box",
    nodes: ["P_air_filter_box"],
    label: "Engine air filter",
    status: "diy",
    reason: "A few clips and no tools. About 10 minutes.",
    about: "Cleans the air going into the engine. A clogged filter costs power and fuel economy.",
    center: [0.457, 0.844, 2.172],
    camera: [1.35, 2.0, 3.55],
    guide: "air-filter",
  },
  {
    id: "battery",
    explorable: true,
    facts: [
      { label: "Lasts", value: "About 3–5 years. Heat wears it out faster than cold." },
      { label: "Signs it's going", value: "Slow, labouring starts, dim lights at start-up, or the battery light on the dash." },
      { label: "Tools", value: "A 10 mm wrench for the terminals and the hold-down." },
      { label: "Buying one", value: "Match the group size and cold-cranking amps (CCA) on the old battery's label." },
    ],
    nodes: ["P_battery"],
    label: "12V battery",
    status: "diy",
    reason: "Two terminals and a hold-down. Disconnect negative first.",
    about: "Starts the car and powers the electronics while the engine is off.",
    center: [0.491, 0.889, 1.683],
    camera: [1.55, 2.1, 2.9],
    guide: "battery",
  },
  {
    id: "washer_fluid_cap",
    explorable: true,
    facts: [
      { label: "Fill with", value: "Washer fluid, not plain water. Water freezes and leaves deposits in the jets." },
      { label: "In winter", value: "Use a fluid rated below freezing (sold as de-icer or winter blend)." },
      { label: "When", value: "Whenever the low-washer warning shows. Engine on or off, it doesn't matter." },
    ],
    nodes: ["P_washer_fluid_cap"],
    label: "Washer fluid",
    status: "diy",
    reason: "Pop the cap and pour. Nothing to remove.",
    about: "Fluid for the windshield washers. Top it up whenever the warning shows.",
    center: [-0.946, 1.031, 1.619],
    camera: [-1.9, 2.05, 2.9],
    guide: "washer-fluid",
  },
  {
    id: "coolant_reservoir",
    explorable: true,
    facts: [
      { label: "Coolant", value: "Honda Type 2 coolant (blue, comes pre-mixed). Don't mix in other colours." },
      { label: "Check", value: "Engine cold. The level should sit between MIN and MAX on the side of the tank." },
      { label: "Careful", value: "Never open it hot: the coolant is under pressure and can scald." },
      { label: "Keeps dropping?", value: "Steady loss means a leak somewhere. Have a mechanic look." },
    ],
    nodes: ["P_coolant_reservoir"],
    label: "Coolant reservoir",
    status: "diy",
    reason: "Checking and topping up is easy. Only open it with the engine cold.",
    about: "Holds extra engine coolant. The level should sit between MIN and MAX.",
    center: [-0.674, 0.882, 1.802],
    camera: [-1.6, 2.0, 3.2],
  },
  {
    id: "oil_dipstick",
    nodes: ["P_oil_dipstick"],
    label: "Oil dipstick",
    status: "diy",
    reason: "Pull, wipe, re-insert, read. Engine warm and off.",
    about: "Shows the engine oil level. Check it about once a month.",
    center: [-0.05, 0.917, 2.127],
    camera: [0.45, 2.0, 3.55],
  },
  {
    id: "oil_fill_cap",
    explorable: true,
    facts: [
      { label: "Oil grade", value: "0W-20, printed on the cap." },
      { label: "Check the level", value: "With the dipstick, engine warm and off, car on level ground." },
      { label: "Oil changes", value: "When the Maintenance Minder on the dash asks for one." },
      { label: "Put it back", value: "Twist it on snug by hand. A loose cap can leak oil and smell of burning." },
    ],
    nodes: ["P_oil_fill_cap"],
    label: "Oil fill cap",
    status: "diy",
    reason: "Twist off to top up oil. Use the grade on the cap (0W-20).",
    about: "Where new engine oil goes in.",
    center: [-0.346, 1.017, 1.921],
    camera: [-0.6, 2.1, 3.35],
  },
  {
    id: "brake_fluid_reservoir",
    nodes: ["P_brake_fluid_reservoir"],
    label: "Brake fluid reservoir",
    status: "shop",
    reason: "You can look at the level, but brake fluid service is a shop job.",
    about: "Feeds the brake hydraulics. A falling level can mean worn pads or a leak.",
    center: [0.307, 0.94, 1.582],
    camera: [0.95, 2.05, 2.85],
  },
  {
    id: "fuse_box",
    explorable: true,
    facts: [
      { label: "What's inside", value: "Fuses and relays for the engine, lights, fans and more." },
      { label: "Find the fuse", value: "The lid has a diagram naming each slot." },
      { label: "Replacing", value: "Same amp rating (the number on top). Never fit a bigger one." },
      { label: "Blows again?", value: "Something is shorting. That's a job for a mechanic." },
      { label: "Also", value: "There's a second fuse box inside the car, under the dashboard." },
    ],
    nodes: ["P_fuse_box"],
    label: "Fuse box",
    status: "advanced",
    reason: "Swapping a fuse is simple, but find out why it blew first.",
    about: "Protects the car's electrical circuits.",
    center: [0.749, 0.873, 1.906],
    camera: [1.75, 2.0, 3.2],
  },
  {
    id: "engine_cover",
    nodes: ["P_engine_cover"],
    label: "Engine (2.0L turbo)",
    status: "shop",
    reason: "Internal engine work needs a mechanic.",
    about: "The K20C1 2.0-litre turbocharged four-cylinder under the red cover.",
    center: [-0.155, 0.935, 1.854],
    camera: [-0.35, 2.3, 3.5],
  },
  {
    id: "intake_duct",
    nodes: ["P_intake_duct"],
    label: "Intake duct",
    status: "advanced",
    reason: "Hose clamps only, but a loose duct causes engine warnings.",
    about: "Carries filtered air from the air box to the turbo.",
    center: [-0.111, 0.892, 2.083],
    camera: [0.1, 2.05, 3.6],
  },
];

export const partById = (id: string | null | undefined) =>
  PARTS.find((p) => p.id === id) ?? null;

/** Demo VIN pattern: decodes as a 2018 Honda Civic Type R via NHTSA vPIC (wildcards allowed). */
export const DEMO_VIN = { pattern: "SHHFK8G7*JU", year: 2018 };
