"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { Cafe } from "@/types/cafe";
import { getCafeDecisionGuide } from "@/lib/cafe-insights";
import {
  getJournalCafeMatch,
  getStoredCoffeeJournal,
  getStoredCoffeeJournalServerSnapshot,
  subscribeToCoffeeJournal,
} from "@/lib/coffee-journal";
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
  const journalEntries = useSyncExternalStore(
    subscribeToCoffeeJournal,
    getStoredCoffeeJournal,
    getStoredCoffeeJournalServerSnapshot,
  );

  const profile = useMemo(
    () => getCoffeeProfileBySlug(profileState?.profileSlug),
    [profileState?.profileSlug],
  );
  const journalMatch = useMemo(
    () => getJournalCafeMatch(cafe, journalEntries),
    [cafe, journalEntries],
  );
  const decisionGuide = getCafeDecisionGuide(cafe);

  if (!profile || !profileState) {
    return (
      <article className="cafe-detail-profile-insight">
        <div className="cafe-detail-profile-insight-head">
          <span>Taste match</span>
          <strong>Start your taste setup</strong>
        </div>
        <p>
          Start your taste setup on the map and Near Me will begin explaining which cafes fit you best.
        </p>
        {journalMatch ? (
          <>
            <div className="cafe-detail-profile-insight-head cafe-detail-profile-insight-head-secondary">
              <span>Journal read</span>
              <strong>{journalMatch.label}</strong>
            </div>
            <p>
              {journalMatch.reason}.
              {journalMatch.support ? ` ${journalMatch.support}.` : ""}
              {" "}Near Me is using your recent coffee memory to shape this recommendation.
            </p>
          </>
        ) : null}
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
        {` ${decisionGuide.bestForDetail}`}
      </p>
      {journalMatch ? (
        <div className="cafe-detail-profile-insight-journal">
          <div className="cafe-detail-profile-insight-head cafe-detail-profile-insight-head-secondary">
            <span>Journal read</span>
            <strong>{journalMatch.label}</strong>
          </div>
          <p>
            {journalMatch.reason}.
            {journalMatch.support ? ` ${journalMatch.support}.` : ""}
            {" "}This is based on the drink styles and taste notes you keep returning to.
          </p>
        </div>
      ) : null}
      <div className="cafe-detail-profile-insight-meta">
        <span>{confidence} taste read</span>
        <span>Best bets: {profile.recommendedDrinks.slice(0, 2).join(" · ")}</span>
      </div>
    </article>
  );
}
