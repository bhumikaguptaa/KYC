"use client";

import { Environment, Lightformer } from "@react-three/drei";

/**
 * Dark studio built from light panels (no HDR download): a long top softbox for the roof and
 * hood reflections, two side strips for the flanks, and a rim light behind. The env map is
 * rendered once (frames={1}), so it costs nothing per frame.
 */
export function Studio() {
  return (
    <>
      <color attach="background" args={["#0a0a0b"]} />
      <fog attach="fog" args={["#0a0a0b", 24, 44]} />

      <Environment resolution={256} frames={1} background={false}>
        <Lightformer form="rect" intensity={2.4} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[12, 3, 1]} />
        <Lightformer form="rect" intensity={1.1} position={[-6, 1.6, 0]} rotation-y={Math.PI / 2} scale={[10, 1.2, 1]} />
        <Lightformer form="rect" intensity={1.1} position={[6, 1.6, 0]} rotation-y={-Math.PI / 2} scale={[10, 1.2, 1]} />
        <Lightformer form="rect" intensity={0.8} position={[0, 2, 8]} scale={[8, 2, 1]} />
        <Lightformer form="ring" intensity={1.6} position={[0, 2.5, -9]} scale={5} />
      </Environment>

      <ambientLight intensity={0.15} />

      <mesh rotation-x={-Math.PI / 2} position={[0, -0.002, 0]}>
        <circleGeometry args={[40, 64]} />
        <meshStandardMaterial color="#0e0e10" roughness={0.9} metalness={0} />
      </mesh>
    </>
  );
}
