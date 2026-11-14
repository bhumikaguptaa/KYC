import * as THREE from "three";
import { TELLTALE } from "@/lib/palette";

/**
 * Fresnel "glass shell" for X-ray mode: nearly invisible where the surface faces the camera,
 * bright at grazing angles, so the body reads as an outline and the parts inside stay visible.
 * Additive and depth-write off, so it never hides what is behind it.
 */
export function createXrayMaterial(color: string = TELLTALE.beam) {
  return new THREE.ShaderMaterial({
    name: "KYC.Xray",
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormalW;
      varying vec3 vViewDirW;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vViewDirW = normalize(cameraPosition - worldPos.xyz);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec3 vNormalW;
      varying vec3 vViewDirW;
      void main() {
        float facing = abs(dot(normalize(vNormalW), normalize(vViewDirW)));
        float rim = pow(1.0 - facing, 2.4);
        gl_FragColor = vec4(uColor, (0.025 + rim * 0.55) * uOpacity);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}
