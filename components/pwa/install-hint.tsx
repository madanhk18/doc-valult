"use client";

import { useEffect, useState } from "react";
import { Share, SquarePlus, X } from "lucide-react";

const KEY = "install-hint-dismissed";

/**
 * iPhone Safari has no install prompt, so explain the two taps once.
 * Hidden when already running from the home screen.
 */
export function InstallHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(KEY) === "1";
    } catch {
      // Storage blocked — still show it.
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- needs the browser
    setVisible(isIos && !standalone && !dismissed);
  }, []);

  if (!visible) return null;

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      // ignore
    }
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-brand p-4 pr-12 text-white shadow-lg">
      <p className="font-semibold">Put Vault on your home screen</p>
      <p className="mt-1 flex flex-wrap items-center gap-1 text-sm text-white/85">
        Tap <Share className="inline size-4" /> Share, then
        <span className="inline-flex items-center gap-1 font-medium text-white">
          <SquarePlus className="size-4" /> Add to Home Screen
        </span>
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-3 right-3 grid size-8 place-items-center rounded-full bg-white/20 hover:bg-white/30"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
