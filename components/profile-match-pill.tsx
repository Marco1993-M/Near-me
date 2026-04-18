"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { Cafe } from "@/types/cafe";
import {
  getCafeProfileMatchScore,
  getCoffeeProfileBySlug,
  getStoredCoffeeProfileSlug,
  getStoredCoffeeProfileSlugServerSnapshot,
  subscribeToCoffeeProfile,
} from "@/lib/coffee-profiler";

type ProfileMatchPillProps = {
  cafe: Cafe;
  variant?: "card" | "inline";
};

function normalizeMatchScore(rawScore: number) {
  return Math.max(68, Math.min(98, Math.round(rawScore * 10)));
}

export function ProfileMatchPill({ cafe, variant = "inline" }: ProfileMatchPillProps) {
  const profileSlug = useSyncExternalStore(
    subscribeToCoffeeProfile,
    getStoredCoffeeProfileSlug,
    getStoredCoffeeProfileSlugServerSnapshot,
  );

  const profile = useMemo(() => getCoffeeProfileBySlug(profileSlug), [profileSlug]);

  if (!profile) {
    return null;
  }

  const matchScore = normalizeMatchScore(getCafeProfileMatchScore(cafe, profile));

  if (variant === "card") {
    return (
      <div className="profile-match-card">
        <span>Great for your profile</span>
        <strong>{profile.shortName}</strong>
        <p>{matchScore}% match for the kind of coffee you said you enjoy.</p>
      </div>
    );
  }

  return (
    <span className="profile-match-pill">
      {profile.shortName} match · {matchScore}%
    </span>
  );
}
