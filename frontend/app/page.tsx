"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, m, type Variants } from "motion/react";
import { glide, spring } from "@/components/ui/MotionProvider";
import { InstallHint } from "@/components/ui/InstallHint";
import { IconArrow, IconCheck, IconWarning } from "@/components/ui/icons";
import { Lamp } from "@/components/ui/status";
import { VinPlate, type PlateState } from "@/components/ui/VinPlate";
import { DEMO_VIN } from "@/lib/car";
import { useScene, type Recall, type Vehicle } from "@/lib/scene-context";
import { tick } from "@/lib/ui";

type RecallResponse = { recalls: Recall[]; filedUnder: string; exact: boolean };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Children of a panel arrive one after another, like a cluster coming alive. */
const stack: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
const rise: Variants = {
  hidden: { opacity: 0, y: 14, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: glide },
};

export default function StartPage() {
  const router = useRouter();
  const s = useScene();
  const { setView, select, setXray, toggle, setGlows, setVehicle, setRecalls } = s;
  const [vin, setVin] = useState("");
  const [plate, setPlate] = useState<PlateState>("idle");
  const [error, setError] = useState<string | null>(null);
  const busy = plate === "busy";

  // Start screen pose: everything closed, slow turntable.
  useEffect(() => {
    setView("start");
    select(null);
    setXray(false);
    setGlows({});
    (["hood", "frontDoors", "rearDoors", "hatch"] as const).forEach((o) => toggle(o, false));
  }, [setView, select, setXray, setGlows, toggle]);

  async function decode(value: string, year?: number) {
    setPlate("busy");
    setError(null);
    try {
      const q = new URLSearchParams({ vin: value, ...(year ? { year: String(year) } : {}) });
      const res = await fetch(`/api/vin?${q}`);
      const data = (await res.json()) as { vehicle?: Vehicle; error?: string };
      if (!res.ok || !data.vehicle) throw new Error(data.error ?? "Couldn't decode that VIN.");
      const v = data.vehicle;

      // Recalls are a bonus: if they fail (for example offline), the car card still shows.
      let recalls: { list: Recall[]; scope: { filedUnder: string; exact: boolean } | null } = { list: [], scope: null };
      try {
        const r = await fetch(`/api/recalls?${new URLSearchParams({ make: v.make, model: v.model, year: v.year })}`);
        if (!r.ok) throw new Error();
        const rd = (await r.json()) as RecallResponse;
        recalls = { list: rd.recalls, scope: { filedUnder: rd.filedUnder, exact: rd.exact } };
      } catch {}

      // Let the plate glow green for a beat, so the "it worked" moment registers.
      setPlate("ok");
      tick(12);
      await sleep(520);
      setVehicle(v);
      setRecalls(recalls.list, recalls.scope);
      setPlate("idle");
    } catch (e) {
      setPlate("error");
      tick(30);
      // fetch rejects with a TypeError when there is no network (and nothing saved to fall back on).
      if (!navigator.onLine || e instanceof TypeError) setError("You're offline. Connect to the internet to look up a VIN.");
      else setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (vin.length === 17 && !busy) void decode(vin);
  };

  const v = s.vehicle;
  const left = 17 - vin.length;

  return (
    <div className="relative flex h-full flex-col justify-end sm:justify-center">
      {/* Scrims keep text readable over a bright car without boxing it in a card. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 h-[72%] bg-gradient-to-t from-ink via-ink/88 to-transparent sm:inset-y-0 sm:left-0 sm:h-auto sm:w-[62%] sm:bg-gradient-to-r sm:via-ink/70"
      />

      <div className="relative w-full px-5 pb-5 sm:w-[min(36rem,52vw)] sm:max-w-none sm:px-0 sm:pb-0 sm:pl-[clamp(2.5rem,6vw,6.5rem)]">
        <AnimatePresence mode="wait" initial={false}>
          {!v ? (
            <m.div
              key="enter"
              className="pointer-events-auto"
              variants={stack}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, y: -10, filter: "blur(6px)", transition: { duration: 0.25 } }}
            >
              <m.div variants={rise} className="flex items-center gap-2.5">
                <Lamp className="text-go" size={7} />
                <span className="gauge-label">KYC · Know your car</span>
              </m.div>

              <m.h1
                variants={rise}
                className="mt-4 text-[clamp(2.35rem,8.4vw,4.4rem)] font-semibold leading-[0.95] tracking-[-0.035em] text-balance"
              >
                Know your car.
                <span className="block text-chalk/40">Inside and out.</span>
              </m.h1>

              <m.p variants={rise} className="mt-3 max-w-[29rem] text-[15px] leading-snug text-chalk/65 sm:mt-4 sm:text-base sm:leading-relaxed">
                Type in your VIN. We&apos;ll build your exact car in 3D, show you what&apos;s under the hood, and tell you what
                you can safely fix yourself.
              </m.p>

              <m.form variants={rise} onSubmit={onSubmit} className="mt-5 sm:mt-7">
                <VinPlate
                  value={vin}
                  onChange={(x) => {
                    setVin(x);
                    if (plate === "error") setPlate("idle");
                    setError(null);
                  }}
                  state={plate}
                />

                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <button
                    type="submit"
                    disabled={busy || left !== 0}
                    className="group relative flex min-h-13 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-chalk px-6 text-[15px] font-semibold text-ink transition active:scale-[0.98] disabled:bg-white/[0.07] disabled:text-chalk/45 sm:min-w-[13rem]"
                  >
                    {busy ? (
                      "Reading your VIN…"
                    ) : left === 0 ? (
                      <>
                        Show my car
                        <IconArrow width={18} height={18} className="transition-transform group-active:translate-x-0.5" />
                      </>
                    ) : vin.length === 0 ? (
                      "Show my car"
                    ) : (
                      <span className="tabular-nums">
                        {left} more character{left === 1 ? "" : "s"}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Fill the field first, so the demo VIN shows even when the lookup cannot run (offline).
                      setVin(DEMO_VIN.pattern);
                      void decode(DEMO_VIN.pattern, DEMO_VIN.year);
                    }}
                    disabled={busy}
                    className="min-h-11 whitespace-nowrap rounded-2xl px-4 text-[15px] text-chalk/70 transition hover:text-chalk active:scale-[0.98] disabled:opacity-40"
                  >
                    No VIN handy? <span className="text-beam">Try a demo car</span>
                  </button>
                </div>
              </m.form>

              <AnimatePresence>
                {error && (
                  <m.p
                    role="alert"
                    className="mt-3 flex items-start gap-2 text-sm text-stop"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <IconWarning width={17} height={17} className="mt-px shrink-0" />
                    {error}
                  </m.p>
                )}
              </AnimatePresence>

              <m.div variants={rise}>
                <WhereIsMyVin />
                <InstallHint />
              </m.div>
            </m.div>
          ) : (
            <m.div
              key="card"
              className="pointer-events-auto"
              variants={stack}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, y: 10, filter: "blur(6px)", transition: { duration: 0.2 } }}
            >
              <m.div variants={rise} className="flex items-center gap-2.5">
                <Lamp className="text-go" size={7} />
                <span className="gauge-label">VIN decoded</span>
                <span className="truncate font-mono text-[11px] tracking-wider text-chalk/35">{v.vin}</span>
              </m.div>

              <m.div variants={rise} className="mt-4 font-mono text-lg tracking-[0.2em] text-chalk/45">
                {v.year}
              </m.div>
              <m.h1
                variants={rise}
                className="text-[clamp(2.4rem,8.5vw,4.4rem)] font-semibold leading-[0.95] tracking-[-0.035em] text-balance"
              >
                {v.make} {v.model}
              </m.h1>
              {(v.trim || v.body) && (
                <m.p variants={rise} className="mt-2 text-base text-chalk/55">
                  {[v.trim, v.body].filter(Boolean).join(" · ")}
                </m.p>
              )}

              <m.dl variants={rise} className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.07]">
                <Spec label="Engine" value={v.engine} wide />
                <Spec label="Drive" value={v.drive} />
                <Spec label="Fuel" value={v.fuel} />
                <Spec label="Built in" value={v.plant} />
              </m.dl>

              <m.div variants={rise}>
                <RecallLine recalls={s.recalls} scope={s.recallScope} />
              </m.div>

              <m.div variants={rise} className="mt-6 flex items-center gap-2">
                <button
                  onClick={() => {
                    tick();
                    router.push("/garage");
                  }}
                  className="group flex min-h-14 flex-1 items-center justify-center gap-2.5 rounded-2xl bg-chalk text-base font-semibold text-ink transition active:scale-[0.98] sm:flex-none sm:px-8"
                >
                  Open my garage
                  <IconArrow width={19} height={19} className="transition-transform group-hover:translate-x-0.5" />
                </button>
                <button
                  onClick={() => {
                    setVehicle(null);
                    setRecalls([], null);
                  }}
                  className="min-h-14 rounded-2xl px-5 text-[15px] text-chalk/60 transition hover:text-chalk"
                >
                  Change car
                </button>
              </m.div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Spec({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`bg-ink/80 px-4 py-3 backdrop-blur-xl ${wide ? "col-span-2" : ""}`}>
      <dt className="gauge-label">{label}</dt>
      <dd className="mt-1 truncate text-[15px] text-chalk/90">{value || "—"}</dd>
    </div>
  );
}

function RecallLine({ recalls, scope }: { recalls: Recall[]; scope: { filedUnder: string; exact: boolean } | null }) {
  if (!scope) return null;
  const clear = !recalls.length;
  return (
    <div className={`mt-4 flex items-start gap-3 text-sm ${clear ? "text-go" : "text-caution"}`}>
      <span className="mt-px" style={{ filter: "drop-shadow(0 0 6px currentColor)" }}>
        {clear ? <IconCheck width={18} height={18} /> : <IconWarning width={18} height={18} />}
      </span>
      <p className="leading-snug">
        {clear ? (
          <>No safety recalls filed for {scope.filedUnder}.</>
        ) : (
          <>
            {recalls.length} safety recall{recalls.length > 1 ? "s" : ""} filed for {scope.filedUnder}
            <span className="text-chalk/50">{!scope.exact && " — check whether yours is included"}.</span>
          </>
        )}
      </p>
    </div>
  );
}

/** Older drivers often don't know where the VIN lives; three places, in plain words. */
function WhereIsMyVin() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="-mx-1 flex min-h-11 items-center gap-2 px-1 text-sm text-chalk/60 transition hover:text-chalk"
      >
        <span
          className={`grid size-5 place-items-center rounded-full border border-white/20 text-[11px] transition-transform ${open ? "rotate-45" : ""}`}
        >
          +
        </span>
        Where do I find my VIN?
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <m.ol
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={spring}
            className="overflow-hidden"
          >
            <Place n={1}>On the dashboard, at the bottom corner of the windshield on the driver&apos;s side.</Place>
            <Place n={2}>On a sticker inside the driver&apos;s door frame.</Place>
            <Place n={3}>On your registration or insurance card.</Place>
          </m.ol>
        )}
      </AnimatePresence>
    </div>
  );
}

function Place({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3 py-1.5 text-sm text-chalk/75 first:pt-2">
      <span className="font-mono text-xs leading-5 text-beam">0{n}</span>
      <span className="leading-5">{children}</span>
    </li>
  );
}
