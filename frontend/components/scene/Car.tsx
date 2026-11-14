"use client";

import { useEffect, useRef } from "react";
import { ContactShadows, Html, useGLTF } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { easing } from "maath";
import * as THREE from "three";
import {
  HINGES,
  LAMP_MATERIAL,
  LIGHT_NODES,
  MODEL_URL,
  PARTS,
  SHELL_NODES,
  SOLID_IN_XRAY_MATERIALS,
  partById,
  type Openable,
} from "@/lib/car";
import { useScene, type Glow } from "@/lib/scene-context";
import { createXrayMaterial } from "./xray-material";

const GLOW_COLORS: Record<Glow, THREE.Color> = {
  select: new THREE.Color("#5bd1ff"),
  diy: new THREE.Color("#34d399"),
  shop: new THREE.Color("#f87171"),
};

type HingeRig = { node: THREE.Object3D; closed: THREE.Quaternion; open: THREE.Quaternion };
type PartRig = { id: string; mats: THREE.MeshStandardMaterial[]; level: { v: number } };
type ShellRig = { mesh: THREE.Mesh; original: THREE.Material | THREE.Material[] };

const AXES = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0) };
const noRaycast = () => {};

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

  // The Blender export lost two materials' settings: tyres came out plain white, and the lamp
  // lenses came out opaque white, hiding the lamps behind them. Restore both.
  for (const m of meshes) {
    const mat = m.material as THREE.MeshStandardMaterial;
    if (mat.name === "FK8.Tire") {
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

  // Parts: own material copies so one part can glow without lighting up the whole engine bay.
  const parts: PartRig[] = PARTS.map((p) => {
    const mats: THREE.MeshStandardMaterial[] = [];
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || mesh.userData.partId) return;
      // Match the mesh or its node group (multi-material nodes load as a group of meshes).
      const owner = [mesh, mesh.parent].find((x) => x && p.nodes.some((n) => x.name.startsWith(n)));
      if (!owner) return;
      const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
      mat.emissive = new THREE.Color(0, 0, 0);
      mat.emissiveIntensity = 1;
      mesh.material = mat;
      mesh.userData.partId = p.id;
      mats.push(mat);
    });
    if (!mats.length) console.warn(`[KYC] part has no meshes: ${p.id}`);
    return { id: p.id, mats, level: { v: 0 } };
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

  return { hinges, parts, shell, lightMats, xray: createXrayMaterial(), lightLevel: { v: 0 }, time: 0 };
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
type Pose = { open: Record<Openable, boolean>; lights: boolean; xray: boolean; selected: string | null; glows: Record<string, Glow> };

/** Swap the shell between its own materials and the X-ray glass (once per toggle). */
function applyXray(r: Rig, on: boolean) {
  for (const { mesh, original } of r.shell) {
    mesh.material = on ? r.xray : original;
    mesh.raycast = on ? noRaycast : THREE.Mesh.prototype.raycast;
  }
  if (on) r.xray.uniforms.uOpacity.value = 0;
}

/** Ease every animated value toward the current pose. Runs once per frame. */
function animate(r: Rig, pose: Pose, delta: number) {
  r.time += delta;

  for (const key of Object.keys(r.hinges) as Openable[])
    for (const h of r.hinges[key]) easing.dampQ(h.node.quaternion, pose.open[key] ? h.open : h.closed, 0.32, delta);

  easing.damp(r.lightLevel, "v", pose.lights ? 1 : 0, 0.18, delta);
  for (const m of r.lightMats.front) m.emissiveIntensity = r.lightLevel.v * 6;
  for (const m of r.lightMats.rear) m.emissiveIntensity = r.lightLevel.v * 3;

  if (pose.xray) easing.damp(r.xray.uniforms.uOpacity, "value", 1, 0.25, delta);

  const pulse = 0.75 + 0.25 * Math.sin(r.time * 3.2);
  for (const p of r.parts) {
    const glow: Glow | undefined = pose.selected === p.id ? "select" : pose.glows[p.id];
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

  useEffect(() => {
    if (rigRef.current) applyXray(rigRef.current, s.xray);
  }, [s.xray, scene]);

  useFrame((_, dt) => {
    if (rigRef.current) animate(rigRef.current, s, Math.min(dt, 0.05));
  });

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    const obj = e.object;
    const partId = obj.userData.partId as string | undefined;
    if (partId) {
      e.stopPropagation();
      s.select(partId);
      s.setView("part");
      return;
    }
    const openable = obj.userData.openable as Openable | undefined;
    if (openable && !s.xray) {
      e.stopPropagation();
      s.toggle(openable);
    }
  };

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    const d = e.object.userData;
    if (d.partId || (d.openable && !s.xray)) document.body.style.cursor = "pointer";
  };
  const onOut = () => {
    document.body.style.cursor = "";
  };

  const selected = partById(s.selected);

  return (
    <group>
      <primitive object={scene} onClick={onClick} onPointerOver={onOver} onPointerOut={onOut} />
      {/* Baked once, after the car exists (it lives inside the car's Suspense boundary). */}
      <ContactShadows position={[0, 0.001, 0]} scale={12} opacity={0.75} blur={2.4} far={2.5} resolution={512} frames={1} />
      {selected && (
        <Html position={[selected.center[0], selected.center[1] + 0.16, selected.center[2]]} center zIndexRange={[20, 0]}>
          <div className="pointer-events-none whitespace-nowrap rounded-full border border-white/15 bg-black/70 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
            {selected.label}
          </div>
        </Html>
      )}
    </group>
  );
}

useGLTF.preload(MODEL_URL, false);
