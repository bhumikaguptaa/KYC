"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { spring } from "@/components/ui/MotionProvider";
import { InstallHint } from "@/components/ui/InstallHint";
import { DEMO_VIN } from "@/lib/car";
import { useScene, type Recall, type Vehicle } from "@/lib/scene-context";

type RecallResponse = { recalls: Recall[]; filedUnder: string; exact: boolean };

export default function StartPage() {
  const router = useRouter();
  const s = useScene();
  const { setView, select, setXray, toggle, setGlows, setVehicle, setRecalls } = s;
  const [vin, setVin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start screen pose: everything closed, slow turntable.
  useEffect(() => {
    setView("start");
    select(null);
    setXray(false);
    setGlows({});
    (["hood", "frontDoors", "rearDoors", "hatch"] as const).forEach((o) => toggle(o, false));
  }, [setView, select, setXray, setGlows, toggle]);

  async function decode(value: string, year?: number) {
    setBusy(true);
    setError(null);
    try {
      const q = new URLSearchParams({ vin: value, ...(year ? { year: String(year) } : {}) });
      const res = await fetch(`/api/vin?${q}`);
      const data = (await res.json()) as { vehicle?: Vehicle; error?: string };
      if (!res.ok || !data.vehicle) throw new Error(data.error ?? "Couldn't decode that VIN.");
      setVehicle(data.vehicle);

      // Recalls are a bonus: if they fail (for example offline), the car card still shows.
      const v = data.vehicle;
      try {
        const r = await fetch(`/api/recalls?${new URLSearchParams({ make: v.make, model: v.model, year: v.year })}`);
        if (!r.ok) throw new Error();
        const rd = (await r.json()) as RecallResponse;
        setRecalls(rd.recalls, { filedUnder: rd.filedUnder, exact: rd.exact });
      } catch {
        setRecalls([], null);
      }
    } catch (e) {
      // fetch rejects with a TypeError when there is no network (and nothing saved to fall back on).
      if (!navigator.onLine || e instanceof TypeError) setError("You're offline. Connect to the internet to look up a VIN.");
      else setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void decode(vin);
  };

  const v = s.vehicle;

  return (
    <div className="flex h-full flex-col justify-end p-5 sm:justify-center sm:p-10">
      <m.div
        className="glass pointer-events-auto w-full max-w-md rounded-3xl p-5 sm:p-6"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.2 }}
      >
        <div className="text-xs font-medium tracking-[0.3em] text-white/50">KYC · KNOW YOUR CAR</div>

        <AnimatePresence mode="wait" initial={false}>
          {!v ? (
            <m.div key="enter" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">Your car, in 3D.</h1>
              <p className="mt-2 text-sm text-white/60">
                Enter your VIN to see your exact car, what&apos;s under the hood, and what you can fix yourself.
              </p>
              <form onSubmit={onSubmit} className="mt-5 flex gap-2">
                <input
                  value={vin}
                  onChange={(e) => setVin(e.target.value.toUpperCase().replace(/[^A-Z0-9*]/g, "").slice(0, 17))}
                  placeholder="17-character VIN"
                  inputMode="text"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  className="min-w-0 flex-1 min-h-12 rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-base tracking-wider outline-none placeholder:font-sans placeholder:tracking-normal placeholder:text-white/30 focus:border-accent/60"
                />
                <button
                  type="submit"
                  disabled={busy || vin.length !== 17}
                  className="min-h-12 rounded-xl bg-white px-5 text-sm font-medium text-black transition active:scale-95 disabled:opacity-30"
                >
                  Decode
                </button>
              </form>
              <button
                type="button"
                onClick={() => {
                  // Fill the field first, so the demo VIN shows even when the lookup cannot run (offline).
                  setVin(DEMO_VIN.pattern);
                  void decode(DEMO_VIN.pattern, DEMO_VIN.year);
                }}
                disabled={busy}
                className="mt-2 -mx-2 min-h-11 px-2 text-sm text-accent transition active:scale-95 disabled:opacity-40"
              >
                {busy ? "Decoding…" : "Use demo car →"}
              </button>
              {error && (
                <p role="alert" className="mt-3 text-sm text-shop">
                  {error}
                </p>
              )}
              <InstallHint />
            </m.div>
          ) : (
            <m.div key="card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                {v.year} {v.make} {v.model}
              </h1>
              <p className="mt-1 text-sm text-white/50">{[v.trim, v.body].filter(Boolean).join(" · ")}</p>
              <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <Spec label="Engine" value={v.engine} />
                <Spec label="Drive" value={v.drive} />
                <Spec label="Fuel" value={v.fuel} />
                <Spec label="Built in" value={v.plant} />
              </dl>
              <RecallLine recalls={s.recalls} scope={s.recallScope} />
              <div className="mt-6 flex items-center gap-3">
                <button
                  onClick={() => router.push("/garage")}
                  className="min-h-12 flex-1 rounded-xl bg-white py-3 text-sm font-medium text-black transition active:scale-[0.98]"
                >
                  Open my garage
                </button>
                <button
                  onClick={() => {
                    setVehicle(null);
                    setRecalls([], null);
                  }}
                  className="min-h-11 px-3 text-sm text-white/50"
                >
                  Change
                </button>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </m.div>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs text-white/40">{label}</dt>
      <dd className="mt-0.5 text-white/90">{value}</dd>
    </div>
  );
}

function RecallLine({ recalls, scope }: { recalls: Recall[]; scope: { filedUnder: string; exact: boolean } | null }) {
  if (!scope) return null;
  if (!recalls.length)
    return <p className="mt-5 text-sm text-diy">No NHTSA recalls filed for {scope.filedUnder}.</p>;
  return (
    <p className="mt-5 text-sm text-advanced">
      {recalls.length} NHTSA recall{recalls.length > 1 ? "s" : ""} filed for {scope.filedUnder}
      {!scope.exact && " (check whether yours is included)"}.
    </p>
  );
}
