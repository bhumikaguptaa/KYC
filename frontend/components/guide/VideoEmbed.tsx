"use client";

import { useState } from "react";
import { IconPlay } from "@/components/ui/icons";
import { useOnline } from "@/lib/pwa";

/**
 * A YouTube video that loads only when the user taps play. Until then it is a plain poster drawn
 * here (not YouTube's thumbnail), so nothing is sent to YouTube before the tap.
 */
export function VideoEmbed({ id, title }: { id: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  const online = useOnline();

  if (!online && !playing) {
    return (
      <div className="grid aspect-video w-full place-items-center rounded-2xl border border-white/[0.07] bg-white/[0.03] text-sm text-chalk/50">
        Video needs a connection.
      </div>
    );
  }

  if (playing) {
    const q = new URLSearchParams({ autoplay: "1", playsinline: "1", rel: "0" });
    return (
      <iframe
        className="aspect-video w-full rounded-2xl bg-black"
        // nocookie domain: no YouTube cookies until the video plays. playsinline keeps it inside
        // the installed app on iOS instead of jumping to full screen.
        src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?${q}`}
        title={title}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    );
  }

  return (
    <button
      onClick={() => setPlaying(true)}
      aria-label={`Play video: ${title}`}
      className="group relative grid aspect-video w-full place-items-center overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111215] transition active:scale-[0.99]"
    >
      {/* A shop-light poster: a lamp pool over a dark floor, with film-strip sprocket edges. */}
      <span
        aria-hidden
        className="absolute inset-0 opacity-80"
        style={{ background: "radial-gradient(80% 70% at 50% 30%, rgb(243 241 236 / 0.12), transparent 70%)" }}
      />
      <span aria-hidden className="absolute inset-x-0 top-0 h-3 opacity-25" style={{ background: "repeating-linear-gradient(90deg, #f3f1ec 0 8px, transparent 8px 18px)", maskImage: "linear-gradient(#000 40%, transparent 41%)" }} />
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-3 opacity-25" style={{ background: "repeating-linear-gradient(90deg, #f3f1ec 0 8px, transparent 8px 18px)", maskImage: "linear-gradient(transparent 59%, #000 60%)" }} />
      <span className="relative grid size-16 place-items-center rounded-full bg-chalk text-ink shadow-[0_12px_40px_-8px_rgb(243_241_236/0.45)] transition group-hover:scale-105 group-active:scale-90">
        <IconPlay width={26} height={26} className="ml-1" />
      </span>
      <span className="absolute inset-x-0 bottom-0 flex items-end justify-between px-4 pb-4 text-left">
        <span className="text-[14px] font-medium text-chalk/85">Watch it done</span>
        <span className="text-[11px] text-chalk/40">Plays from YouTube</span>
      </span>
    </button>
  );
}
