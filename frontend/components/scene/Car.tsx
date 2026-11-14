"use client";

import { useEffect, useRef } from "react";
import { ContactShadows, useGLTF } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { easing } from "maath";
import * as THREE from "three";
import {
  EXPLORE,
  HINGES,
  LAMP_MATERIAL,
  LIGHT_NODES,
  MODEL_URL,
  PARTS,
  SHELL_NODES,
  SOLID_IN_XRAY_MATERIALS,
  WIPERS,
  partById,
  type Openable,
} from "@/lib/car";
import { TELLTALE } from "@/lib/palette";
import { useScene, type Glow, type View } from "@/lib/scene-context";
import { createXrayMaterial } from "./xray-material";

const GLOW_COLORS: Record<Glow, THREE.Color> = {
  select: new THREE.Color(TELLTALE.beam),
  diy: new THREE.Color(TELLTALE.go),
  shop: new THREE.Color(TELLTALE.stop),
};

type HingeRig = { node: THREE.Object3D; closed: THREE.Quaternion; open: THREE.Quaternion };
type PartRig = {
  id: string;
  mats: THREE.MeshStandardMaterial[];
  /** back-face fills shown while the part is out, so the open mesh reads as a solid object */
  caps: THREE.Mesh[];
  level: { v: number };
  /** group at the part's centre holding its meshes; moved and scaled to take the part out */
  holder: THREE.Group;
  /** the holder's resting position, in its parent's space */
  home: THREE.Vector3;
  /** scale that makes the part about EXPLORE.size across when taken out */
  outScale: number;
};
type ShellRig = { mesh: THREE.Mesh; original: THREE.Material | THREE.Material[] };
/** How the car is drawn: its own materials, X-ray shell, or (exploring) everything but one part ghosted. */
type Look = { xray: boolean; outId: string | null };

const AXES = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0) };
const EXPLORE_POINT = new THREE.Vector3(...EXPLORE.point);
const tmp = new THREE.Vector3();
const noRaycast = () => {};

type WiperRig = { pivot: THREE.Group; axis: THREE.Vector3; sweep: number };

type AnyAttribute = THREE.BufferAttribute | THREE.InterleavedBufferAttribute;

/** Copy just the listed vertices of an attribute (same type and normalisation) into a new one. */
function pickVertices(attr: AnyAttribute, used: number[]) {
  const source = "isInterleavedBufferAttribute" in attr ? attr.data.array : attr.array;
  const Arr = source.constructor as new (n: number) => THREE.TypedArray;
  const out = new THREE.BufferAttribute(new Arr(used.length * attr.itemSize), attr.itemSize, attr.normalized);
  const get = [attr.getX, attr.getY, attr.getZ, attr.getW];
  const set = [out.setX, out.setY, out.setZ, out.setW];
  used.forEach((from, i) => {
    for (let c = 0; c < attr.itemSize; c++) set[c].call(out, i, get[c].call(attr, from));
  });
  return out;
}

/**
 * Split the wiper mesh into its two arms and hang each on a pivot group. The mesh is welded by
 * position into connected pieces; each piece goes to the first arm whose `owns` accepts the
 * piece's centre (world space). The arms share the original vertex data, only the index differs.
 */
function rigWipers(scene: THREE.Group): WiperRig[] {
  const src = scene.getObjectByName(WIPERS.node) as THREE.Mesh | undefined;
  if (!src?.isMesh || !src.parent) {
    console.warn(`[KYC] wiper mesh missing: ${WIPERS.node}`);
    return [];
  }
  const geo = src.geometry;
  const pos = geo.getAttribute("position");
  const index = geo.index ? Array.from(geo.index.array) : [...Array(pos.count).keys()];

  // World positions, and one id per distinct position (welds seams split for normals/UVs).
  const world = Array.from({ length: pos.count }, (_, i) =>
    new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(src.matrixWorld),
  );
  const byKey = new Map<string, number>();
  const weld = world.map((v, i) => {
    const key = `${v.x.toFixed(4)},${v.y.toFixed(4)},${v.z.toFixed(4)}`;
    if (!byKey.has(key)) byKey.set(key, i);
    return byKey.get(key)!;
  });
  const parent = weld.map((_, i) => i);
  const find = (a: number): number => {
    while (parent[a] !== a) a = parent[a] = parent[parent[a]];
    return a;
  };
  for (let t = 0; t < index.length; t += 3) {
    const a = find(weld[index[t]]);
    parent[find(weld[index[t + 1]])] = a;
    parent[find(weld[index[t + 2]])] = a;
  }

  // Centre of each piece, then which arm it belongs to.
  const sums = new Map<number, { sum: THREE.Vector3; n: number }>();
  world.forEach((v, i) => {
    const root = find(weld[i]);
    const e = sums.get(root) ?? { sum: new THREE.Vector3(), n: 0 };
    e.sum.add(v);
    e.n++;
    sums.set(root, e);
  });
  const armOf = new Map<number, number>();
  for (const [root, { sum, n }] of sums) {
    const c = sum.divideScalar(n);
    armOf.set(root, WIPERS.arms.findIndex((arm) => arm.owns([c.x, c.y, c.z])));
  }

  const holder = new THREE.Group();
  holder.name = WIPERS.node; // keeps the shell / X-ray lookup by name working
  src.parent.add(holder);
  const rigs = WIPERS.arms.map((arm, k) => {
    const tris: number[] = [];
    for (let t = 0; t < index.length; t += 3) if (armOf.get(find(weld[index[t]])) === k) tris.push(index[t], index[t + 1], index[t + 2]);
    // Each arm gets only its own vertices, so its bounds (used for sizing, centring and culling)
    // are its own and not both arms'.
    const used = [...new Set(tris)];
    const remap = new Map(used.map((v, i) => [v, i]));
    const part = new THREE.BufferGeometry();
    for (const [name, attr] of Object.entries(geo.attributes)) part.setAttribute(name, pickVertices(attr, used));
    part.setIndex(tris.map((v) => remap.get(v)!));
    const mesh = new THREE.Mesh(part, src.material);
    mesh.name = arm.name;
    mesh.userData.wipers = true;
    // Same placement as the original mesh, then onto a pivot at the arm's base.
    mesh.matrixAutoUpdate = src.matrixAutoUpdate;
    mesh.position.copy(src.position);
    mesh.quaternion.copy(src.quaternion);
    mesh.scale.copy(src.scale);
    const pivot = new THREE.Group();
    pivot.name = `${arm.name}Pivot`;
    pivot.position.set(...arm.pivot);
    holder.add(pivot);
    src.parent!.add(mesh);
    holder.updateMatrixWorld(true);
    pivot.attach(mesh);
    const axis = new THREE.Vector3(...arm.axis).normalize();
    return { pivot, axis, sweep: THREE.MathUtils.degToRad(arm.sweep), tris: tris.length / 3 };
  });
  src.removeFromParent();
  if (rigs.some((r) => r.tris === 0)) console.warn("[KYC] a wiper arm got no geometry");
  return rigs.map(({ pivot, axis: a, sweep }) => ({ pivot, axis: a, sweep }));
}

/** Build all the lookups for a loaded model. Mutates the scene, so it must run once per scene. */
function buildRig(scene: THREE.Group) {
  const byName = (name: string) => scene.getObjectByName(name);
  scene.updateMatrixWorld(true);

  // Hinges: each panel is re-parented under a pivot group sitting on its hinge line, and the
  // pivot rotates. (The model's own node origins sit at mesh centres after optimisation.)
  const hinges = {} as Record<Openable, HingeRig[]>;
  for (const key of Object.keys(HINGES) as Openable[]) {
    hinges[key] = HINGES[key].flatMap((h) => {
      const node = byName(h.node);
      if (!node) {
        console.warn(`[KYC] hinge node missing: ${h.node}`);
        return [];
      }
      const pivot = new THREE.Group();
      pivot.name = `${h.node}Hinge`;
      pivot.position.set(...h.pivot);
      (node.parent ?? scene).add(pivot);
      pivot.updateMatrixWorld(true);
      for (const name of [h.node, ...("carries" in h ? h.carries : [])]) {
        const o = byName(name);
        if (o) pivot.attach(o);
        else console.warn(`[KYC] hinge node missing: ${name}`);
      }
      const closed = pivot.quaternion.clone();
      const turn = new THREE.Quaternion().setFromAxisAngle(AXES[h.axis], THREE.MathUtils.degToRad(h.angle));
      return [{ node: pivot, closed, open: turn.multiply(closed) }];
    });
  }

  const wipers = rigWipers(scene);

  // Openable panels: tapping the hood, a door or the hatch toggles it.
  const openableByNode: Record<string, Openable> = {};
  for (const key of Object.keys(HINGES) as Openable[])
    for (const h of HINGES[key]) for (const n of [h.node, ...("carries" in h ? h.carries : [])]) openableByNode[n] = key;

  // Clear-coat car paint.
  const meshes: THREE.Mesh[] = [];
  scene.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
  });
  const paintSource = meshes
    .map((m) => m.material as THREE.MeshStandardMaterial)
    .find((m) => m?.name === "FK8.Paint");
  if (paintSource) {
    const paint = new THREE.MeshPhysicalMaterial({
      name: "FK8.Paint",
      color: paintSource.color.clone(),
      metalness: 0.55,
      roughness: 0.32,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      envMapIntensity: 1.2,
    });
    for (const m of meshes) if ((m.material as THREE.Material).name === "FK8.Paint") m.material = paint;
  }

  // Fix materials the Blender export got wrong: tyres came out plain white, the lamp lenses
  // opaque white (hiding the lamps), and the engine-bay material as alpha *blend*, which three.js
  // draws without depth writes, so inner faces showed through outer ones. Its texture's alpha is
  // a plain cutout (fully opaque or fully clear), so draw it opaque with an alpha cutoff instead.
  for (const m of meshes) {
    const mat = m.material as THREE.MeshStandardMaterial;
    if (mat.name === "FK8.Engine") {
      mat.transparent = false;
      mat.depthWrite = true;
      mat.alphaTest = 0.5;
    } else if (mat.name === "FK8.Tire") {
      mat.color.set("#151517");
      mat.roughness = 0.9;
    } else if (mat.name === "FK8.HeadlightGlass") {
      mat.color.set("#ffffff");
      mat.transparent = true;
      mat.opacity = 0.16;
      mat.roughness = 0.05;
      mat.metalness = 0;
      mat.depthWrite = false;
    }
  }

  // Lights: one lamp material is shared by every light, so each side gets its own copy.
  const lightMats = { front: [] as THREE.MeshStandardMaterial[], rear: [] as THREE.MeshStandardMaterial[] };
  for (const side of ["front", "rear"] as const) {
    let lamp: THREE.MeshStandardMaterial | null = null;
    for (const name of LIGHT_NODES[side]) {
      byName(name)?.traverse((c) => {
        const mesh = c as THREE.Mesh;
        if (!mesh.isMesh || (mesh.material as THREE.Material).name !== LAMP_MATERIAL) return;
        if (!lamp) {
          lamp = (mesh.material as THREE.MeshStandardMaterial).clone();
          lamp.emissive = new THREE.Color(side === "front" ? "#f4f8ff" : "#ff2a2a");
          lamp.emissiveIntensity = 0;
          lightMats[side].push(lamp);
        }
        mesh.material = lamp;
      });
    }
    if (!lamp) console.warn(`[KYC] no ${side} lamp meshes found`);
  }

  // Parts: own material copies so one part can glow without lighting up the whole engine bay,
  // and a holder group at the part's centre so it can be lifted out and scaled up to explore.
  const capMat = new THREE.MeshBasicMaterial({ name: "KYC.PartCap", color: "#2a2a2f", side: THREE.BackSide });
  const parts: PartRig[] = PARTS.map((p) => {
    const mats: THREE.MeshStandardMaterial[] = [];
    const meshesOfPart: THREE.Mesh[] = [];
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || mesh.userData.partId) return;
      // Match the mesh or its node group (multi-material nodes load as a group of meshes).
      const owner = [mesh, mesh.parent].find((x) => x && p.nodes.some((n) => x.name.startsWith(n)));
      if (!owner) return;
      const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
      mat.emissive = new THREE.Color(0, 0, 0);
      mat.emissiveIntensity = 1;
      // Parts were modelled to be seen from above; taken out, they're seen from every side.
      mat.side = THREE.DoubleSide;
      mesh.material = mat;
      mesh.userData.partId = p.id;
      mats.push(mat);
      meshesOfPart.push(mesh);
    });
    if (!mats.length) console.warn(`[KYC] part has no meshes: ${p.id}`);

    const box = new THREE.Box3();
    for (const m of meshesOfPart) box.expandByObject(m);
    const centre = box.isEmpty() ? new THREE.Vector3(...p.center) : box.getCenter(new THREE.Vector3());
    const dims = box.isEmpty() ? new THREE.Vector3(1, 1, 1) : box.getSize(new THREE.Vector3());
    // The holder lives where the part's meshes live (the scene root for engine parts, the arm's
    // pivot for a wiper), so the part still moves with anything it hangs on.
    const parentOfPart = meshesOfPart[0]?.parent ?? scene;
    parentOfPart.updateMatrixWorld(true);
    const home = parentOfPart.worldToLocal(centre.clone());
    const holder = new THREE.Group();
    holder.name = `${p.id}Holder`;
    holder.position.copy(home);
    parentOfPart.add(holder);
    holder.updateMatrixWorld(true);
    for (const m of meshesOfPart) holder.attach(m);
    // Every part is shown at the same overall extent (bounding sphere of an EXPLORE.size cube, which
    // is what the camera frames): small parts grow, and a long arm shrinks without ending up a sliver.
    const outScale = THREE.MathUtils.clamp((EXPLORE.size * Math.sqrt(3)) / dims.length(), 0.25, 6);

    // The meshes are open shells (modelled to be seen from above). Taken out, a back-face-only copy
    // drawn in a flat colour fills every view into the inside, so the part reads as solid.
    const caps = meshesOfPart.map((m) => {
      const cap = new THREE.Mesh(m.geometry, capMat);
      cap.name = `${m.name}Cap`;
      cap.userData.cap = true;
      cap.visible = false;
      cap.raycast = noRaycast;
      m.add(cap);
      return cap;
    });
    return { id: p.id, mats, caps, level: { v: 0 }, holder, home, outScale };
  });

  // X-ray shell: exterior meshes swap to fresnel glass; the cabin stays solid.
  const shell: ShellRig[] = [];
  for (const name of SHELL_NODES) {
    const node = byName(name);
    if (!node) {
      console.warn(`[KYC] shell node missing: ${name}`);
      continue;
    }
    node.traverse((c) => {
      const mesh = c as THREE.Mesh;
      if (!mesh.isMesh) return;
      const matName = (mesh.material as THREE.Material).name;
      if (SOLID_IN_XRAY_MATERIALS.includes(matName)) return;
      shell.push({ mesh, original: mesh.material });
    });
  }
  for (const [nodeName, key] of Object.entries(openableByNode)) {
    byName(nodeName)?.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) c.userData.openable = key;
    });
  }

  // Everything drawn, with its own material, so exploring can ghost the whole car but one part.
  const all: ShellRig[] = [];
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh && !mesh.userData.cap) all.push({ mesh, original: mesh.material });
  });

  return {
    hinges,
    wipers,
    /** wiper stroke progress in strokes; whole numbers are the parked position */
    wiperPhase: { v: 0 },
    parts,
    shell,
    all,
    lightMats,
    xray: createXrayMaterial(),
    // Dimmer glass for the rest of the car while a part is out, so it never gets in the way.
    ghost: createXrayMaterial(),
    lightLevel: { v: 0 },
    time: 0,
    look: { xray: false, outId: null } as Look,
  };
}

type Rig = ReturnType<typeof buildRig>;

// useGLTF caches the scene across mounts, so the rig is cached with it. Re-rigging a remounted
// scene would re-clone materials and re-parent panels that are already on their pivots.
const rigs = new WeakMap<THREE.Object3D, Rig>();
function rigFor(scene: THREE.Group) {
  let r = rigs.get(scene);
  if (!r) {
    r = buildRig(scene);
    rigs.set(scene, r);
  }
  return r;
}

/** What the frame loop reads from the UI state each frame. */
type Pose = {
  view: View;
  open: Record<Openable, boolean>;
  lights: boolean;
  wipers: boolean;
  xray: boolean;
  selected: string | null;
  glows: Record<string, Glow>;
};

/** The part that is taken out, if any (only parts flagged explorable come out). */
const outPart = (pose: Pick<Pose, "view" | "selected">) =>
  pose.view === "explore" && partById(pose.selected)?.explorable ? pose.selected : null;

/** Put every mesh in the right material for the look (runs once per change, not per frame). */
function applyLook(r: Rig, look: Look) {
  const prev = r.look;
  for (const { mesh, original } of r.all) {
    mesh.material = original;
    mesh.raycast = THREE.Mesh.prototype.raycast;
  }
  if (look.outId) {
    // Exploring: the whole car but the taken-out part turns to faint glass. Parts left in the bay
    // stay tappable (to swap which one is out); the rest of the car ignores taps.
    for (const { mesh } of r.all) {
      if (mesh.userData.partId === look.outId) continue;
      mesh.material = r.ghost;
      if (!mesh.userData.partId) mesh.raycast = noRaycast;
    }
    if (!prev.outId) r.ghost.uniforms.uOpacity.value = 0;
  } else if (look.xray) {
    for (const { mesh } of r.shell) {
      mesh.material = r.xray;
      mesh.raycast = noRaycast;
    }
    if (!prev.xray || prev.outId) r.xray.uniforms.uOpacity.value = 0;
  }
  for (const p of r.parts) {
    const solid = p.id === look.outId;
    for (const c of p.caps) c.visible = solid;
    for (const m of p.mats) {
      const side = solid ? THREE.FrontSide : THREE.DoubleSide;
      if (m.side !== side) {
        m.side = side;
        m.needsUpdate = true;
      }
    }
  }
  r.look = look;
}

/** Ease every animated value toward the current pose. Runs once per frame. */
function animate(r: Rig, pose: Pose, delta: number) {
  r.time += delta;

  for (const key of Object.keys(r.hinges) as Openable[])
    for (const h of r.hinges[key]) easing.dampQ(h.node.quaternion, pose.open[key] ? h.open : h.closed, 0.32, delta);

  // Wipers: sweep up and back while on; when switched off, finish the stroke and park. They also
  // park while a wiper is taken out to explore (it hangs on its arm's pivot).
  const sweeping = pose.wipers && !partById(outPart(pose))?.nodes.some((n) => n.startsWith("FK8Wiper"));
  const phase = r.wiperPhase;
  const parked = phase.v === Math.floor(phase.v);
  if (sweeping || !parked) {
    const next = phase.v + delta / WIPERS.period;
    phase.v = !sweeping && Math.floor(next) > Math.floor(phase.v) ? Math.floor(next) : next;
  }
  const stroke = 0.5 - 0.5 * Math.cos(phase.v * Math.PI * 2); // 0 parked .. 1 top of the sweep
  for (const w of r.wipers) w.pivot.quaternion.setFromAxisAngle(w.axis, w.sweep * stroke);

  easing.damp(r.lightLevel, "v", pose.lights ? 1 : 0, 0.18, delta);
  for (const m of r.lightMats.front) m.emissiveIntensity = r.lightLevel.v * 6;
  for (const m of r.lightMats.rear) m.emissiveIntensity = r.lightLevel.v * 3;

  if (r.look.outId) easing.damp(r.ghost.uniforms.uOpacity, "value", 0.4, 0.25, delta);
  else if (r.look.xray) easing.damp(r.xray.uniforms.uOpacity, "value", 1, 0.25, delta);

  const pulse = 0.75 + 0.25 * Math.sin(r.time * 3.2);
  const outId = outPart(pose);
  for (const p of r.parts) {
    // Taken out: rise to the explore point and grow; otherwise settle back into the bay.
    const out = p.id === outId;
    const target = out ? p.holder.parent!.worldToLocal(tmp.copy(EXPLORE_POINT)) : p.home;
    easing.damp3(p.holder.position, target, 0.4, delta);
    easing.damp3(p.holder.scale, out ? p.outScale : 1, 0.4, delta);

    // No glow while it's out: the point is to see its real surface.
    const glow: Glow | undefined = out ? undefined : pose.selected === p.id ? "select" : pose.glows[p.id];
    easing.damp(p.level, "v", glow ? 1 : 0, 0.2, delta);
    const color = GLOW_COLORS[glow ?? "select"];
    for (const m of p.mats) {
      m.emissive.copy(color);
      m.emissiveIntensity = p.level.v * pulse * 0.9;
    }
  }
}

export function Car() {
  // No Draco (second argument): the model is meshopt-compressed, and the meshopt decoder ships in
  // our own bundle, so loading needs no third-party download and works offline.
  const { scene } = useGLTF(MODEL_URL, false);
  const s = useScene();
  const { setModelReady } = s;
  // three.js objects are mutated imperatively (above), so the rig lives behind a ref, not in render state.
  const rigRef = useRef<Rig | null>(null);

  useEffect(() => {
    rigRef.current = rigFor(scene);
    setModelReady(true);
  }, [scene, setModelReady]);

  const outId = outPart(s);
  // Tapping panels open is off while the body is glass (X-ray or exploring).
  const ghost = s.xray || outId !== null;
  useEffect(() => {
    if (rigRef.current) applyLook(rigRef.current, { xray: s.xray, outId });
  }, [s.xray, outId, scene]);

  useFrame((_, dt) => {
    if (rigRef.current) animate(rigRef.current, s, Math.min(dt, 0.05));
  });

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    const obj = e.object;
    const partId = obj.userData.partId as string | undefined;
    const underHood = s.view === "engineBay" || s.view === "part" || s.view === "explore";
    // Around the car, tapping a wiper runs the wipers; under the hood it's a part like the others.
    if (partId && (underHood || !obj.userData.wipers)) {
      e.stopPropagation();
      s.select(partId);
      // While exploring, tapping another part swaps which one is out (if that part can come out).
      if (s.view !== "explore" || !partById(partId)?.explorable) s.setView("part");
      return;
    }
    if (obj.userData.wipers && !ghost) {
      e.stopPropagation();
      s.setWipers(!s.wipers);
      return;
    }
    const openable = obj.userData.openable as Openable | undefined;
    if (openable && !ghost) {
      e.stopPropagation();
      s.toggle(openable);
    }
  };

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    const d = e.object.userData;
    if (d.partId || ((d.openable || d.wipers) && !ghost)) document.body.style.cursor = "pointer";
  };
  const onOut = () => {
    document.body.style.cursor = "";
  };

  return (
    <group>
      <primitive object={scene} onClick={onClick} onPointerOver={onOver} onPointerOut={onOut} />
      {/* Baked once, after the car exists (it lives inside the car's Suspense boundary). */}
      <ContactShadows position={[0, 0.001, 0]} scale={12} opacity={0.75} blur={2.4} far={2.5} resolution={512} frames={1} />
      {/* Part labels and pins are drawn by <Hotspots/>. */}
    </group>
  );
}

useGLTF.preload(MODEL_URL, false);
