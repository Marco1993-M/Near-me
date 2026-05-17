"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { Cafe } from "@/types/cafe";
import {
  getCafeProfileMatch,
  getCoffeeProfileBySlug,
  getCoffeeProfileConfidence,
  getStoredCoffeeProfileState,
  getStoredCoffeeProfileStateServerSnapshot,
  subscribeToCoffeeProfile,
} from "@/lib/coffee-profiler";

type CafeDetailProfileInsightProps = {
  cafe: Cafe;
};

export function CafeDetailProfileInsight({ cafe }: CafeDetailProfileInsightProps) {
  const profileState = useSyncExternalStore(
    subscribeToCoffeeProfile,
    getStoredCoffeeProfileState,
    getStoredCoffeeProfileStateServerSnapshot,
  );

  const profile = useMemo(
    () => getCoffeeProfileBySlug(profileState?.profileSlug),
    [profileState?.profileSlug],
  );

  if (!profile || !profileState) {
    return (
      <article className="cafe-detail-profile-insight">
        <div className="cafe-detail-profile-insight-head">
          <span>Taste match</span>
          <strong>Unlock your profile</strong>
        </div>
        <p>
          Take the Coffee Profiler on the map and Near Me will start explaining which cafes fit your taste best.
        </p>
      </article>
    );
  }

  const match = getCafeProfileMatch(cafe, profile, profileState);
  const confidence = getCoffeeProfileConfidence(profileState);

  return (
    <article className="cafe-detail-profile-insight">
      <div className="cafe-detail-profile-insight-head">
        <span>Your taste match</span>
        <strong>{match.percentage}%</strong>
      </div>
      <p>
        <strong>{profile.name}</strong> looks like a {match.label.toLowerCase()} here.
        {match.reasons.length > 0 ? ` Near Me is seeing signals like ${match.reasons.join(" and ")}.` : ""}
      </p>
      <div className="cafe-detail-profile-insight-meta">
        <span>{confidence} profile</span>
        <span>Best bets: {profile.recommendedDrinks.slice(0, 2).join(" · ")}</span>
      </div>
    </article>
  );
}
