"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Openable } from "./car";
import type { QuoteItem } from "./quote";

/**
 * Which camera framing the scene should fly to. Pages set this; the CameraRig reacts.
 * "explore" = the selected part is taken out of the bay to be turned around and inspected.
 */
export type View = "start" | "garage" | "engineBay" | "part" | "explore";
/** How a part glows: the user's selection, or a slip result. */
export type Glow = "select" | "diy" | "advanced" | "shop";

export type Vehicle = {
  vin: string;
  year: string;
  make: string;
  model: string;
  trim: string;
  body: string;
  engine: string;
  drive: string;
  fuel: string;
  plant: string;
};

export type Recall = {
  campaign: string;
  component: string;
  summary: string;
  remedy: string;
  date: string;
};

type SceneState = {
  view: View;
  setView: (v: View) => void;
  open: Record<Openable, boolean>;
  toggle: (o: Openable, value?: boolean) => void;
  lights: boolean;
  setLights: (v: boolean) => void;
  wipers: boolean;
  setWipers: (v: boolean) => void;
  xray: boolean;
  setXray: (v: boolean) => void;
  selected: string | null;
  select: (id: string | null) => void;
  glows: Record<string, Glow>;
  setGlows: (g: Record<string, Glow>) => void;
  modelReady: boolean;
  setModelReady: (v: boolean) => void;
  vehicle: Vehicle | null;
  setVehicle: (v: Vehicle | null) => void;
  /** bumped to fly the camera back to the current view's framing */
  recenterKey: number;
  recenter: () => void;
  /**
   * A page can slide the picture to make room for its own panels (camera-space metres, x then y).
   * null = the view's default framing.
   */
  frameOffset: [number, number] | null;
  setFrameOffset: (o: [number, number] | null) => void;
  recalls: Recall[];
  /** what NHTSA filed the recalls under, and whether that is this exact model or its family */
  recallScope: { filedUnder: string; exact: boolean } | null;
  setRecalls: (r: Recall[], scope: { filedUnder: string; exact: boolean } | null) => void;
  /** lines read from the uploaded repair quote; null until a quote has been read */
  quote: QuoteItem[] | null;
  setQuote: (q: QuoteItem[] | null) => void;
};

const SceneContext = createContext<SceneState | null>(null);

export function SceneProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>("start");
  const [open, setOpen] = useState<Record<Openable, boolean>>({
    hood: false,
    frontDoors: false,
    rearDoors: false,
    hatch: false,
  });
  const [lights, setLights] = useState(false);
  const [wipers, setWipers] = useState(false);
  const [xray, setXray] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [glows, setGlows] = useState<Record<string, Glow>>({});
  const [modelReady, setModelReady] = useState(false);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [recenterKey, setRecenterKey] = useState(0);
  const [frameOffset, setFrameOffset] = useState<[number, number] | null>(null);
  const recenter = useCallback(() => setRecenterKey((k) => k + 1), []);
  const [recalls, setRecallList] = useState<Recall[]>([]);
  const [recallScope, setRecallScope] = useState<SceneState["recallScope"]>(null);
  const [quote, setQuote] = useState<QuoteItem[] | null>(null);

  // Stable callbacks so pages can list them as effect dependencies without re-running every render.
  const toggle = useCallback(
    (o: Openable, v?: boolean) => setOpen((st) => ({ ...st, [o]: v ?? !st[o] })),
    [],
  );
  const setRecalls = useCallback((r: Recall[], scope: SceneState["recallScope"]) => {
    setRecallList(r);
    setRecallScope(scope);
  }, []);

  const value = useMemo<SceneState>(
    () => ({
      view,
      setView,
      open,
      toggle,
      lights,
      setLights,
      wipers,
      setWipers,
      xray,
      setXray,
      selected,
      select: setSelected,
      glows,
      setGlows,
      modelReady,
      setModelReady,
      vehicle,
      setVehicle,
      recenterKey,
      recenter,
      frameOffset,
      setFrameOffset,
      recalls,
      recallScope,
      setRecalls,
      quote,
      setQuote,
    }),
    [view, open, toggle, lights, wipers, xray, selected, glows, modelReady, vehicle, recenterKey, recenter, frameOffset, recalls, recallScope, setRecalls, quote],
  );

  return <SceneContext.Provider value={value}>{children}</SceneContext.Provider>;
}

export function useScene() {
  const ctx = useContext(SceneContext);
  if (!ctx) throw new Error("useScene must be used inside <SceneProvider>");
  return ctx;
}
