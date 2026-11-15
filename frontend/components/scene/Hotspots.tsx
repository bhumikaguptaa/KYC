"use client";

import { useRef } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { MathUtils, Vector3 } from "three";
import { PARTS, type Part } from "@/lib/car";
import { PANEL_SPOTS, type PanelSpot } from "@/lib/hotspots";
import { useScene } from "@/lib/scene-context";
import { tick } from "@/lib/ui";

const toCam = new Vector3();
const normal = new Vector3();

/**
 * Labels that live on the car. Around the car: "Open hood", "Open front doors"… on the panels
 * themselves, the way a Tesla screen labels its frunk and trunk. Under the hood: a lamp on every
 * part in its status colour, so the bay reads as a map of what you can and can't do.
 *
 * Html content is rendered in its own React root, so it gets data and callbacks as props
 * (no context) and animates with CSS, not motion.
 */
export function Hotspots() {
  const s = useScene();
  const outside = s.modelReady && s.view === "garage" && !s.xray;
  const bay = s.modelReady && (s.view === "engineBay" || s.view === "part");
  const panels = useRef(new Map<string, HTMLDivElement>());
  // When a page lights parts up (a quote, a story chapter), the pins follow: only the lit parts,
  // in their glow colour. Otherwise every part, in its status colour.
  const lit = Object.keys(s.glows).length > 0;

  // Fade each panel label by how squarely its panel faces the camera.
  useFrame(({ camera }) => {
    if (!outside) return;
    for (const spot of PANEL_SPOTS) {
      const el = panels.current.get(spot.id);
      if (!el) continue;
      toCam.copy(camera.position).sub(normal.set(...spot.position)).normalize();
      const facing = normal.set(...spot.normal).normalize().dot(toCam);
      const o = MathUtils.smoothstep(facing, 0.0, 0.2);
      el.style.opacity = o.toFixed(3);
      el.style.pointerEvents = o > 0.6 ? "auto" : "none";
    }
  });

  return (
    <>
      {outside &&
        PANEL_SPOTS.map((spot, i) => (
          <Html key={spot.id} position={spot.position} center zIndexRange={[16, 0]}>
            <div
              ref={(el) => {
                if (el) panels.current.set(spot.id, el);
                else panels.current.delete(spot.id);
              }}
              style={{ opacity: 0, transition: "opacity 160ms linear" }}
            >
              <PanelLabel
                spot={spot}
                open={s.open[spot.opens]}
                delay={i * 60}
                onPress={() => {
                  tick();
                  s.toggle(spot.opens);
                }}
              />
            </div>
          </Html>
        ))}

      {bay &&
        PARTS.filter((p) => !lit || s.glows[p.id]).map((p, i) => (
          <Html key={p.id} position={p.center} center zIndexRange={[16, 0]}>
            <PartPin
              part={p}
              tone={PIN_COLOR[lit ? s.glows[p.id] : p.status]}
              selected={s.selected === p.id}
              dim={s.view === "part" && s.selected !== p.id}
              delay={i * 35}
              onPress={() => {
                tick();
                s.select(p.id);
                s.setView("part");
              }}
            />
          </Html>
        ))}
    </>
  );
}

function PanelLabel({ spot, open, delay, onPress }: { spot: PanelSpot; open: boolean; delay: number; onPress: () => void }) {
  return (
    <button
      onClick={onPress}
      className="spot-in group flex items-center gap-2 whitespace-nowrap rounded-full border border-white/12 bg-[rgb(12_13_16/0.72)] py-1 pl-1 pr-3.5 text-[13px] font-medium text-chalk shadow-[0_6px_20px_-6px_rgb(0_0_0/0.8)] backdrop-blur-md transition-transform hover:scale-[1.04] active:scale-95"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="relative grid size-6 place-items-center rounded-full bg-white/[0.08]">
        {!open && <span className="ping-ring absolute inset-1.5 rounded-full border border-chalk/70" />}
        <span className={`size-2 rounded-full transition-colors ${open ? "lamp text-beam" : "bg-chalk"}`} />
      </span>
      <span>
        <span className="text-chalk/55">{open ? "Close" : "Open"}</span> {spot.label}
      </span>
    </button>
  );
}

const PIN_COLOR = { diy: "text-go", advanced: "text-caution", shop: "text-stop", select: "text-beam" } as const;

function PartPin({
  part,
  tone,
  selected,
  dim,
  delay,
  onPress,
}: {
  part: Part;
  tone: string;
  selected: boolean;
  dim: boolean;
  delay: number;
  onPress: () => void;
}) {
  return (
    <button
      onClick={onPress}
      aria-label={part.label}
      className={`spot-in relative grid size-9 place-items-center transition-opacity duration-300 ${dim ? "opacity-45" : ""} ${tone}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {selected && <span className="ping-ring absolute inset-2.5 rounded-full border-2 border-current" />}
      <span
        className={`lamp rounded-full ring-2 ring-[rgb(10_10_11/0.85)] transition-[width,height] duration-300 ${selected ? "size-3.5" : "size-2.5"}`}
      />
      {selected && (
        <span className="spot-in absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/12 bg-[rgb(12_13_16/0.8)] px-3 py-1 text-xs font-medium text-chalk backdrop-blur-md">
          {part.label}
        </span>
      )}
    </button>
  );
}
