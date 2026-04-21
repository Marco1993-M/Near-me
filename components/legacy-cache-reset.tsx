"use client";

import { useEffect } from "react";

const LEGACY_CACHE_RESET_FLAG = "near-me-legacy-cache-reset-v1";

export function LegacyCacheReset() {
  useEffect(() => {
    let cancelled = false;

    async function resetLegacyClientCaches() {
      if (typeof window === "undefined") {
        return;
      }

      const hasResetAlready = window.sessionStorage.getItem(LEGACY_CACHE_RESET_FLAG) === "1";

      const registrations =
        "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistrations() : [];

      const cacheKeys = "caches" in window ? await window.caches.keys() : [];
      const legacyCacheKeys = cacheKeys.filter((key) => key.startsWith("near-me-") || key.includes("workbox"));

      const hadLegacyState = registrations.length > 0 || legacyCacheKeys.length > 0;

      await Promise.all(registrations.map((registration) => registration.unregister()));
      await Promise.all(legacyCacheKeys.map((key) => window.caches.delete(key)));

      if (!cancelled && hadLegacyState && !hasResetAlready) {
        window.sessionStorage.setItem(LEGACY_CACHE_RESET_FLAG, "1");
        window.location.reload();
      }
    }

    void resetLegacyClientCaches();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
