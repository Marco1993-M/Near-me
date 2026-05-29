"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  getCoffeeJournalInsight,
  getStoredCoffeeJournal,
  getStoredCoffeeJournalServerSnapshot,
  subscribeToCoffeeJournal,
} from "@/lib/coffee-journal";

type CoffeeJournalPanelProps = {
  onClose: () => void;
  onLogCurrent?: () => void;
  currentCafeName?: string | null;
};

function formatRelativeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "short",
  }).format(date);
}

export function CoffeeJournalPanel({
  onClose,
  onLogCurrent,
  currentCafeName,
}: CoffeeJournalPanelProps) {
  const entries = useSyncExternalStore(
    subscribeToCoffeeJournal,
    getStoredCoffeeJournal,
    getStoredCoffeeJournalServerSnapshot,
  );

  const insight = useMemo(() => getCoffeeJournalInsight(entries), [entries]);

  return (
    <div className="map-journal-shell fade-slide-in">
      <section className="map-journal-panel" role="dialog" aria-modal="false" aria-label="Coffee journal">
        <div className="map-top-picks-head">
          <div className="map-top-picks-title">
            <strong>Coffee journal</strong>
            <span>Your private coffee memory.</span>
          </div>
          <div className="map-top-picks-head-actions">
            {onLogCurrent ? (
              <button className="map-top-picks-profile-button" type="button" onClick={onLogCurrent}>
                {currentCafeName ? `Log ${currentCafeName}` : "Log a visit"}
              </button>
            ) : null}
            <button className="map-search-close" type="button" onClick={onClose} aria-label="Close journal">
              Close
            </button>
          </div>
        </div>

        <div className="coffee-journal-summary-grid">
          <article className="coffee-journal-summary-card">
            <span>Entries</span>
            <strong>{insight.entryCount}</strong>
          </article>
          <article className="coffee-journal-summary-card">
            <span>Go-to drink</span>
            <strong>{insight.favoriteDrink ?? "Still learning"}</strong>
          </article>
          <article className="coffee-journal-summary-card">
            <span>Common notes</span>
            <strong>{insight.topTags.length > 0 ? insight.topTags.slice(0, 2).join(" · ") : "Add a few tags"}</strong>
          </article>
        </div>

        <article className="coffee-journal-pulse">
          <span>Quiet coffee lesson</span>
          <strong>{insight.glossaryTip}</strong>
          <p>{insight.learningPrompt}</p>
        </article>

        <div className="map-top-picks-results coffee-journal-results">
          {entries.length > 0 ? (
            entries.map((entry) => (
              <article className="coffee-journal-entry" key={entry.id}>
                <div className="coffee-journal-entry-head">
                  <div>
                    <strong>{entry.cafeName}</strong>
                    <span>
                      {[entry.city, entry.drink, formatRelativeDate(entry.createdAt)].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                  <div className="coffee-journal-entry-score">
                    <strong>{entry.rating}/10</strong>
                    <span>{entry.source === "review" ? "Shared review" : "Private log"}</span>
                  </div>
                </div>
                {entry.note ? <p>{entry.note}</p> : null}
                {entry.tags.length > 0 ? (
                  <div className="diesel-selection-tags">
                    {entry.tags.map((tag) => (
                      <span className="diesel-selection-tag" key={`${entry.id}-${tag}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>
            ))
          ) : (
            <div className="map-top-picks-empty">
              <strong>No journal entries yet</strong>
              <span>
                Log a few drinks and Near Me will start learning your patterns, vocabulary, and at-home cues.
              </span>
              {onLogCurrent ? (
                <button className="map-top-picks-cta" type="button" onClick={onLogCurrent}>
                  Log your first coffee
                </button>
              ) : null}
            </div>
          )}
        </div>

        {entries.length > 0 ? (
          <div className="coffee-journal-footer-note">
            <span>At-home cue</span>
            <strong>{insight.homeCue}</strong>
          </div>
        ) : null}
      </section>
    </div>
  );
}
