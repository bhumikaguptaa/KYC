import type { PartStatus } from "@/lib/car";

/** What each repair status means, in the dashboard's colours. */
export const STATUS: Record<
  PartStatus,
  { label: string; short: string; plain: string; text: string; bg: string; lamp: string; level: 1 | 2 | 3 }
> = {
  diy: {
    label: "Do it yourself",
    short: "Do it yourself",
    plain: "Safe to do at home",
    text: "text-go",
    bg: "bg-go/12",
    lamp: "text-go",
    level: 1,
  },
  advanced: {
    label: "Advanced DIY",
    short: "Careful",
    plain: "Doable, with care",
    text: "text-caution",
    bg: "bg-caution/12",
    lamp: "text-caution",
    level: 2,
  },
  shop: {
    label: "Mechanic only",
    short: "Mechanic",
    plain: "Leave it to a pro",
    text: "text-stop",
    bg: "bg-stop/12",
    lamp: "text-stop",
    level: 3,
  },
};

export const STATUS_ORDER: PartStatus[] = ["diy", "advanced", "shop"];

/** A lit tell-tale dot. */
export function Lamp({ className = "", size = 8 }: { className?: string; size?: number }) {
  return <span aria-hidden className={`lamp inline-block shrink-0 ${className}`} style={{ width: size, height: size }} />;
}

/**
 * How hard a job is, as a three-segment gauge (like a fuel gauge): one lit segment is easy,
 * three is mechanic territory. Segments take the status colour.
 */
export function Effort({ status }: { status: PartStatus }) {
  const s = STATUS[status];
  return (
    <div className="flex items-center gap-2.5" aria-label={`Difficulty ${s.level} of 3`}>
      <div className={`flex gap-1 ${s.text}`}>
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={`h-1.5 w-5 rounded-full ${n <= s.level ? "bg-current shadow-[0_0_8px_-1px_currentColor]" : "bg-white/12"}`}
          />
        ))}
      </div>
      <span className="text-xs text-white/55">{s.plain}</span>
    </div>
  );
}
