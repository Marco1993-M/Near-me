"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { Cafe } from "@/types/cafe";
import {
  getCafeProfileMatch,
  getCoffeeProfileBySlug,
  getCoffeeProfileConfidence,
  getCoffeeProfileTraitLabels,
  getStoredCoffeeProfileState,
  getStoredCoffeeProfileStateServerSnapshot,
  subscribeToCoffeeProfile,
} from "@/lib/coffee-profiler";

type ProfileMatchPillProps = {
  cafe: Cafe;
  variant?: "card" | "inline";
};

export function ProfileMatchPill({ cafe, variant = "inline" }: ProfileMatchPillProps) {
  const profileState = useSyncExternalStore(
    subscribeToCoffeeProfile,
    getStoredCoffeeProfileState,
    getStoredCoffeeProfileStateServerSnapshot,
  );

  const profile = useMemo(
    () => getCoffeeProfileBySlug(profileState?.profileSlug),
    [profileState?.profileSlug],
  );

  if (!profile) {
    return null;
  }

  const match = getCafeProfileMatch(cafe, profile, profileState);
  const confidence = getCoffeeProfileConfidence(profileState);
  const traitLabels = profileState ? getCoffeeProfileTraitLabels(profileState.scores, 2) : [];

  if (variant === "card") {
    return (
      <div className="profile-match-card">
        <span>{match.label}</span>
        <strong>{profile.name}</strong>
        <p>
          {match.percentage}% match for your taste profile.
          {traitLabels.length > 0 ? ` You usually lean toward ${traitLabels.join(" and ")}.` : ""}
        </p>
        <small>
          {confidence} profile
          {match.reasons.length > 0 ? ` · because of ${match.reasons.join(" and ")}` : ""}
        </small>
      </div>
    );
  }

  return (
    <span className="profile-match-pill">
      {profile.shortName} · {match.percentage}%
    </span>
  );
}
