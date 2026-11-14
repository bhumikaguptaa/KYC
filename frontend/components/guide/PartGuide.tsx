"use client";

import { GUIDES } from "@/lib/guides";
import { isPartId } from "@/lib/quote";
import { VideoEmbed } from "./VideoEmbed";

/** The how-to for one part: time, tools, numbered steps, then the video. */
export function PartGuide({ partId }: { partId: string }) {
  const guide = isPartId(partId) ? GUIDES[partId] : undefined;
  if (!guide) return null;

  return (
    <div className="mt-3">
      <h3 className="text-sm font-medium text-white/90">{guide.title}</h3>
      <p className="mt-0.5 text-xs text-white/45">About {guide.minutes} minutes</p>

      <h4 className="mt-4 text-xs text-white/45">You need</h4>
      <ul className="mt-1 space-y-0.5 text-sm text-white/80">
        {guide.tools.map((t) => (
          <li key={t}>· {t}</li>
        ))}
      </ul>

      <h4 className="mt-4 text-xs text-white/45">Steps</h4>
      <ol className="mt-1.5 space-y-2.5 text-sm text-white/90">
        {guide.steps.map((step, i) => (
          <li key={step} className="flex gap-3">
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-white/10 text-[11px] tabular-nums text-white/70">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      {guide.youtubeId && (
        <div className="mt-4">
          <VideoEmbed id={guide.youtubeId} title={guide.title} />
        </div>
      )}
    </div>
  );
}
