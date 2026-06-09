"use client";

import { useEffect } from "react";

type AppVersionRefreshProps = {
  currentVersion: string;
};

const APP_VERSION_REFRESH_FLAG = "near-me-app-version-refresh";

export function AppVersionRefresh({ currentVersion }: AppVersionRefreshProps) {
  useEffect(() => {
    let cancelled = false;

    async function checkForNewVersion() {
      if (typeof window === "undefined" || !currentVersion || currentVersion === "dev") {
        return;
      }

      try {
        const response = await fetch(`/api/app-version?current=${encodeURIComponent(currentVersion)}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { version?: string };
        if (cancelled || !payload.version || payload.version === currentVersion) {
          return;
        }

        const refreshKey = `${APP_VERSION_REFRESH_FLAG}:${payload.version}`;
        if (window.sessionStorage.getItem(refreshKey) === "1") {
          return;
        }

        window.sessionStorage.setItem(refreshKey, "1");
        window.location.reload();
      } catch {
        // Quietly skip if the version check fails.
      }
    }

    void checkForNewVersion();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void checkForNewVersion();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currentVersion]);

  return null;
}
