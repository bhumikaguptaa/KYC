"use client";

import { useState } from "react";
import { m } from "motion/react";
import { IconCheck, IconClock, IconSpanner } from "@/components/ui/icons";
import { spring } from "@/components/ui/MotionProvider";
import { GUIDES } from "@/lib/guides";
import { isPartId } from "@/lib/quote";
import { tick } from "@/lib/ui";
import { ToolList } from "./ToolList";
import { VideoEmbed } from "./VideoEmbed";

/**
 * The how-to for one part, laid out like a page of a service manual: time and tools, then the
 * steps. Each step is a big button you tick off as you go, standing at the car with the phone in
 * one hand; the next step to do is lit. The video sits at the end.
 */
export function PartGuide({ partId, compact = false }: { partId: string; compact?: boolean }) {
  const guide = isPartId(partId) ? GUIDES[partId] : undefined;
  const [done, setDone] = useState<Set<number>>(() => new Set());
  if (!guide) return null;

  const next = guide.steps.findIndex((_, i) => !done.has(i));
  const flip = (i: number) => {
    tick(done.has(i) ? 8 : 16);
    setDone((d) => {
      const n = new Set(d);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  };
  const all = done.size === guide.steps.length;

  return (
    <div>
      <h3 className="text-[17px] font-semibold leading-snug">{guide.title}</h3>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-chalk/60">
        <span className="flex items-center gap-1.5">
          <IconClock width={15} height={15} />
          About {guide.minutes} min
        </span>
        <span className="flex items-center gap-1.5 tabular-nums">
          <span className="relative h-1 w-14 overflow-hidden rounded-full bg-white/10">
            <m.span
              className="absolute inset-y-0 left-0 rounded-full bg-go"
              animate={{ width: `${(done.size / guide.steps.length) * 100}%` }}
              transition={spring}
            />
          </span>
          {done.size} of {guide.steps.length} done
        </span>
      </div>

      <div className="mt-4 rounded-2xl bg-white/[0.04] px-4 py-3">
        <div className="gauge-label flex items-center gap-1.5">
          <IconSpanner width={14} height={14} />
          You need
        </div>
        <ToolList tools={guide.tools} />
      </div>

      <ol className="relative mt-4" aria-label="Steps">
        {/* The rail behind the step numbers; it fills green as steps are ticked off. */}
        <span aria-hidden className="absolute bottom-5 left-[17px] top-5 w-px bg-white/10" />
        {guide.steps.map((step, i) => {
          const isDone = done.has(i);
          const isNext = i === next;
          return (
            <li key={step}>
              <button
                onClick={() => flip(i)}
                aria-pressed={isDone}
                className={`group relative flex w-full items-start gap-3 rounded-2xl py-2.5 pl-1 pr-2 text-left transition-colors ${
                  isNext ? "bg-white/[0.05]" : ""
                }`}
              >
                <span
                  className={`relative grid size-[27px] shrink-0 place-items-center rounded-full border text-[12px] font-semibold tabular-nums transition-colors duration-300 ${
                    isDone
                      ? "border-go bg-go text-ink"
                      : isNext
                        ? "border-beam bg-ink text-beam shadow-[0_0_12px_-2px_var(--color-beam)]"
                        : "border-white/15 bg-ink text-chalk/55"
                  }`}
                >
                  {isDone ? <IconCheck width={15} height={15} strokeWidth={2.4} /> : i + 1}
                </span>
                <span
                  className={`pt-[3px] leading-snug transition-colors duration-300 ${compact ? "text-[14px]" : "text-[15px]"} ${
                    isDone ? "text-chalk/40 line-through decoration-chalk/25" : "text-chalk/90"
                  }`}
                >
                  {step}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {all && (
        <m.p
          className="mt-2 flex items-center gap-2 rounded-2xl bg-go/12 px-4 py-3 text-[14px] font-medium text-go"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
        >
          <IconCheck width={17} height={17} />
          All done. Nice work.
        </m.p>
      )}

      <p className="mt-3 text-[12.5px] leading-snug text-chalk/45">
        If anything looks different from these steps, or something feels stuck, stop and ask a mechanic.
      </p>

      {guide.youtubeId && (
        <div className="mt-4">
          <VideoEmbed id={guide.youtubeId} title={guide.title} />
        </div>
      )}
    </div>
  );
}
