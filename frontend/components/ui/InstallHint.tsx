"use client";

import { useState } from "react";
import { useInstallPrompt, useIsIos, useStandalone } from "@/lib/pwa";

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
    <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3 text-xs text-white/55">
      {install ? (
        <button onClick={() => void install()} className="min-h-11 flex-1 text-left text-accent">
          Install KYC as an app
        </button>
      ) : (
        <p className="flex-1">
          Install: tap <span className="text-white/85">Share</span>, then{" "}
          <span className="text-white/85">Add to Home Screen</span>.
        </p>
      )}
      <button onClick={dismiss} aria-label="Dismiss install hint" className="-mr-2 grid size-11 place-items-center text-base text-white/40">
        ✕
      </button>
    </div>
  );
}
