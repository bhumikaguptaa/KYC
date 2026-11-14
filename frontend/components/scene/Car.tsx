"use client";

import { useEffect, useMemo, useRef } from "react";
import { ContactShadows, Html, useGLTF } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { easing } from "maath";
import * as THREE from "three";
import {
  HINGES,
  LIGHT_MATERIALS,
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

/** Build all the lookups once per loaded model. */
function rig(scene: THREE.Group) {
  const byName = (name: string) => scene.getObjectByName(name);

  // Hinges: open pose = a world-axis rotation applied on top of the closed pose.
  const hinges = {} as Record<Openable, HingeRig[]>;
  for (const key of Object.keys(HINGES) as Openable[]) {
    hinges[key] = HINGES[key].flatMap((h) => {
      const node = byName(h.node);
      if (!node) {
        console.warn(`[KYC] hinge node missing: ${h.node}`);
        return [];
      }
      const closed = node.quaternion.clone();
      const turn = new THREE.Quaternion().setFromAxisAngle(AXES[h.axis], THREE.MathUtils.degToRad(h.angle));
      return [{ node, closed, open: turn.multiply(closed) }];
    });
  }

  // Openable panels: tapping the hood or a door toggles it.
  const openableByNode: Record<string, Openable> = {};
  for (const key of Object.keys(HINGES) as Openable[]) for (const h of HINGES[key]) openableByNode[h.node] = key;

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

  // Lights: collect emissive materials by name.
  const lightMats = { front: [] as THREE.MeshStandardMaterial[], rear: [] as THREE.MeshStandardMaterial[] };
  for (const m of meshes) {
    const mat = m.material as THREE.MeshStandardMaterial;
    for (const side of ["front", "rear"] as const) {
      if (LIGHT_MATERIALS[side].includes(mat.name) && !lightMats[side].includes(mat)) {
        mat.emissive = new THREE.Color(side === "front" ? "#f4f8ff" : "#ff2a2a");
        mat.emissiveIntensity = 0;
        lightMats[side].push(mat);
      }
    }
  }

  // Parts: own material copies so one part can glow without lighting up the whole engine bay.
  const parts: PartRig[] = PARTS.map((p) => {
    const mats: THREE.MeshStandardMaterial[] = [];
    scene.traverse((o) => {
      if (!p.nodes.some((n) => o.name.startsWith(n))) return;
      o.traverse((c) => {
        const mesh = c as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
        mat.emissive = new THREE.Color(0, 0, 0);
        mat.emissiveIntensity = 1;
        mesh.material = mat;
        mesh.userData.partId = p.id;
        mats.push(mat);
      });
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
      mesh.userData.openable = openableByNode[name];
      shell.push({ mesh, original: mesh.material });
    });
  }
  // Panels outside the shell list can still be tapped open (e.g. tailgate glass is in the list too).
  for (const [nodeName, key] of Object.entries(openableByNode)) {
    byName(nodeName)?.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) c.userData.openable = key;
    });
  }

  return { hinges, parts, shell, lightMats };
}

export function Car() {
  const { scene } = useGLTF(MODEL_URL);
  const s = useScene();
  const { setModelReady } = s;
  const rigged = useMemo(() => rig(scene), [scene]);
  const xray = useMemo(() => createXrayMaterial(), []);
  const lightLevel = useRef({ v: 0 });
  const t = useRef(0);

  useEffect(() => {
    setModelReady(true);
  }, [setModelReady]);

  // X-ray swap: materials change once per toggle; the fade happens in useFrame.
  useEffect(() => {
    for (const { mesh, original } of rigged.shell) {
      mesh.material = s.xray ? xray : original;
      mesh.raycast = s.xray ? noRaycast : THREE.Mesh.prototype.raycast;
    }
    if (s.xray) xray.uniforms.uOpacity.value = 0;
  }, [s.xray, rigged, xray]);

  useFrame((_, dt) => {
    const delta = Math.min(dt, 0.05);
    t.current += delta;

    for (const key of Object.keys(rigged.hinges) as Openable[]) {
      const isOpen = s.open[key];
      for (const h of rigged.hinges[key]) easing.dampQ(h.node.quaternion, isOpen ? h.open : h.closed, 0.32, delta);
    }

    easing.damp(lightLevel.current, "v", s.lights ? 1 : 0, 0.18, delta);
    for (const m of rigged.lightMats.front) m.emissiveIntensity = lightLevel.current.v * 6;
    for (const m of rigged.lightMats.rear) m.emissiveIntensity = lightLevel.current.v * 3;

    if (s.xray) easing.damp(xray.uniforms.uOpacity, "value", 1, 0.25, delta);

    const pulse = 0.75 + 0.25 * Math.sin(t.current * 3.2);
    for (const p of rigged.parts) {
      const glow: Glow | undefined = s.selected === p.id ? "select" : s.glows[p.id];
      easing.damp(p.level, "v", glow ? 1 : 0, 0.2, delta);
      const color = GLOW_COLORS[glow ?? "select"];
      for (const m of p.mats) {
        m.emissive.copy(color);
        m.emissiveIntensity = p.level.v * pulse * 0.9;
      }
    }
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

useGLTF.preload(MODEL_URL);
