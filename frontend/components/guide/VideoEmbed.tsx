"use client";

import { useState } from "react";
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
      <div className="grid aspect-video w-full place-items-center rounded-2xl bg-white/5 text-sm text-white/50">
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
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    );
  }

  return (
    <button
      onClick={() => setPlaying(true)}
      aria-label={`Play video: ${title}`}
      className="group relative grid aspect-video w-full place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/[0.02] transition active:scale-[0.99]"
    >
      <span className="grid size-14 place-items-center rounded-full bg-white text-black shadow-lg transition group-active:scale-90">
        <svg viewBox="0 0 24 24" className="ml-0.5 size-6" fill="currentColor" aria-hidden>
          <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
        </svg>
      </span>
      <span className="absolute inset-x-0 bottom-0 px-3 pb-2.5 text-left text-xs text-white/60">Watch how it&apos;s done</span>
    </button>
  );
}
