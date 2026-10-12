"use client";

import { useEffect } from "react";

/** Registers the service worker once. No-op in dev and unsupported browsers. */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
