"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  getCoffeeProfileBySlug,
  getCoffeeProfileConfidence,
  getCoffeeProfileTraitLabels,
  getStoredCoffeeProfileState,
  getStoredCoffeeProfileStateServerSnapshot,
  subscribeToCoffeeProfile,
} from "@/lib/coffee-profiler";

type CoffeeProfileCardProps = {
  onRetake?: () => void;
  variant?: "default" | "floating";
};

export function CoffeeProfileCard({ onRetake, variant = "default" }: CoffeeProfileCardProps) {
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
    return null;
  }

  const confidence = getCoffeeProfileConfidence(profileState);
  const traits = getCoffeeProfileTraitLabels(profileState.scores, 3);
  const bestBets = profile.recommendedDrinks.slice(0, 2).join(" · ");

  if (variant === "floating") {
    return (
      <section className="coffee-profile-card coffee-profile-card-floating">
        <div className="coffee-profile-card-head">
          <div className="coffee-profile-card-copy">
            <span>Taste on</span>
            <strong>{profile.shortName}</strong>
            <p>{traits.length > 0 ? traits.slice(0, 2).join(" · ") : profile.description}</p>
          </div>
          {onRetake ? (
            <button className="coffee-profile-card-action" type="button" onClick={onRetake}>
              Tune
            </button>
          ) : null}
        </div>

        <div className="coffee-profile-card-meta">
          <span>{confidence}</span>
          <span>{bestBets}</span>
        </div>
      </section>
    );
  }

  return (
    <section className="coffee-profile-card">
      <div className="coffee-profile-card-head">
        <div className="coffee-profile-card-copy">
          <span>Your taste profile</span>
          <strong>{profile.name}</strong>
          <p>{profile.description}</p>
        </div>
        {onRetake ? (
          <button className="coffee-profile-card-action" type="button" onClick={onRetake}>
            Retake
          </button>
        ) : null}
      </div>

      <div className="coffee-profile-card-meta">
        <span>{confidence} profile</span>
        <span>{profileState.reviewCount} review{profileState.reviewCount === 1 ? "" : "s"} shaping it</span>
      </div>

      <div className="coffee-profile-card-grid">
        <div>
          <strong>You usually enjoy</strong>
          <span>{traits.length > 0 ? traits.join(" · ") : "A balanced mix of specialty coffee styles"}</span>
        </div>
        <div>
          <strong>Best bets</strong>
          <span>{profile.recommendedDrinks.slice(0, 3).join(" · ")}</span>
        </div>
      </div>
    </section>
  );
}
