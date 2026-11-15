"use client";

import { useState } from "react";
import { useInstallPrompt, useIsIos, useStandalone } from "@/lib/pwa";
import { IconClose, IconDownload } from "./icons";

const KEY = "kyc:install-dismissed";
const wasDismissed = () => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

/**
 * Invites the user to install the app. Chrome (Android, desktop) gets a real install button;
 * iOS has no install event, so it gets a one-line how-to. Hidden once installed or dismissed.
 */
export function InstallHint() {
  const standalone = useStandalone();
  const ios = useIsIos();
  const install = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);

  if (standalone || dismissed || (!install && !ios) || wasDismissed()) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
  };

  return (
    <div className="mt-4 flex items-center gap-3 border-t border-white/[0.08] pt-3 text-sm text-chalk/60">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-chalk/80">
        <IconDownload width={18} height={18} />
      </span>
      {install ? (
        <button onClick={() => void install()} className="min-h-11 flex-1 text-left">
          <span className="text-chalk">Put KYC on your home screen</span>
          <span className="block text-xs text-chalk/50">Works offline, opens full screen</span>
        </button>
      ) : (
        <p className="flex-1 leading-snug">
          Add KYC to your home screen: tap <span className="text-chalk">Share</span>, then{" "}
          <span className="text-chalk">Add to Home Screen</span>.
        </p>
      )}
      <button
        onClick={dismiss}
        aria-label="Dismiss install hint"
        className="-mr-2 grid size-11 shrink-0 place-items-center text-chalk/40 transition hover:text-chalk"
      >
        <IconClose width={18} height={18} />
      </button>
    </div>
  );
}
