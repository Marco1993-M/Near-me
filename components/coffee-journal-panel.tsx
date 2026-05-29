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

type JournalSection = {
  label: string;
  entries: ReturnType<typeof getStoredCoffeeJournal>;
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

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

function getJournalSections(entries: ReturnType<typeof getStoredCoffeeJournal>): JournalSection[] {
  const today = startOfToday();
  const weekAgo = today - 6 * 24 * 60 * 60 * 1000;
  const buckets: JournalSection[] = [
    { label: "Today", entries: [] },
    { label: "This week", entries: [] },
    { label: "Earlier", entries: [] },
  ];

  entries.forEach((entry) => {
    const timestamp = new Date(entry.createdAt).getTime();

    if (Number.isNaN(timestamp)) {
      buckets[2].entries.push(entry);
      return;
    }

    if (timestamp >= today) {
      buckets[0].entries.push(entry);
      return;
    }

    if (timestamp >= weekAgo) {
      buckets[1].entries.push(entry);
      return;
    }

    buckets[2].entries.push(entry);
  });

  return buckets.filter((bucket) => bucket.entries.length > 0);
}

function getDrinkBadge(drink: string) {
  switch (drink) {
    case "Espresso":
      return { short: "ES", label: "Espresso lane" };
    case "Milk drink":
      return { short: "MK", label: "Milk drink" };
    case "Filter":
      return { short: "FL", label: "Filter" };
    case "Cold":
      return { short: "CL", label: "Cold coffee" };
    case "Seasonal":
      return { short: "SE", label: "Seasonal pick" };
    default:
      return { short: "CF", label: "Coffee" };
  }
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
  const leadingTags = insight.topTags.slice(0, 3);
  const journalSections = useMemo(() => getJournalSections(entries), [entries]);

  return (
    <div className="map-journal-shell fade-slide-in">
      <section className="map-journal-panel" role="dialog" aria-modal="false" aria-label="Coffee journal">
        <div className="coffee-journal-static">
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

          <section className="coffee-journal-hero" aria-label="Journal snapshot">
            <article className="coffee-journal-hero-card coffee-journal-hero-card-primary">
              <div className="coffee-journal-hero-head">
                <span>Current taste mood</span>
                <div className="coffee-journal-orb" aria-hidden="true" />
              </div>
              <strong>{insight.tasteMood}</strong>
              <p>{insight.favoriteDrink ? `${insight.favoriteDrink} is the current go-to.` : "Log a few drinks to sharpen this."}</p>
              {leadingTags.length > 0 ? (
                <div className="diesel-selection-tags">
                  {leadingTags.map((tag) => (
                    <span className="diesel-selection-tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>

            <div className="coffee-journal-summary-grid">
              <article className="coffee-journal-summary-card">
                <span>Entries</span>
                <strong>{insight.entryCount}</strong>
              </article>
              <article className="coffee-journal-summary-card">
                <span>Average score</span>
                <strong>{insight.averageRating ? `${insight.averageRating}/10` : "No score yet"}</strong>
              </article>
              <article className="coffee-journal-summary-card">
                <span>Cities</span>
                <strong>{insight.cityCount}</strong>
              </article>
            </div>
          </section>

          <section className="coffee-journal-spectrum" aria-label="Taste spectrum">
            <div className="coffee-journal-spectrum-row">
              <span>Comfort</span>
              <div className="coffee-journal-spectrum-track">
                <div
                  className="coffee-journal-spectrum-dot"
                  style={{ left: `${insight.tasteAxes.flavor * 100}%` }}
                />
              </div>
              <span>Bright</span>
            </div>
            <div className="coffee-journal-spectrum-row">
              <span>Light</span>
              <div className="coffee-journal-spectrum-track">
                <div
                  className="coffee-journal-spectrum-dot"
                  style={{ left: `${insight.tasteAxes.body * 100}%` }}
                />
              </div>
              <span>Rich</span>
            </div>
            <div className="coffee-journal-spectrum-row">
              <span>Classic</span>
              <div className="coffee-journal-spectrum-track">
                <div
                  className="coffee-journal-spectrum-dot"
                  style={{ left: `${insight.tasteAxes.exploration * 100}%` }}
                />
              </div>
              <span>Curious</span>
            </div>
          </section>

          <article className="coffee-journal-pulse">
            <span>Near Me is learning</span>
            <strong>{insight.learningPrompt}</strong>
          </article>
        </div>

        <div className="map-top-picks-results coffee-journal-results">
          {entries.length > 0 ? (
            <>
              {journalSections.map((section) => (
                <section className="coffee-journal-section" key={section.label}>
                  <div className="coffee-journal-section-head">
                    <span>{section.label}</span>
                    <strong>{section.entries.length}</strong>
                  </div>

                  <div className="coffee-journal-section-list">
                    {section.entries.map((entry) => {
                      const drinkBadge = getDrinkBadge(entry.drink);

                      return (
                        <article className="coffee-journal-entry" key={entry.id}>
                          <div className="coffee-journal-entry-topline">
                            <div className="coffee-journal-drink-badge" aria-hidden="true">
                              <span>{drinkBadge.short}</span>
                            </div>

                            <div className="coffee-journal-entry-main">
                              <div className="coffee-journal-entry-title-row">
                                <strong>{entry.cafeName}</strong>
                                <span className="coffee-journal-entry-date">{formatRelativeDate(entry.createdAt)}</span>
                              </div>
                              <span>
                                {[entry.city, entry.drink].filter(Boolean).join(" · ")}
                              </span>
                            </div>

                            <div className="coffee-journal-entry-score">
                              <strong>{entry.rating}</strong>
                              <span>/10</span>
                            </div>
                          </div>

                          {entry.tags.length > 0 ? (
                            <div className="diesel-selection-tags">
                              {entry.tags.slice(0, 3).map((tag) => (
                                <span className="diesel-selection-tag" key={`${entry.id}-${tag}`}>
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : null}

                          {entry.note ? <p>{entry.note}</p> : null}

                          <div className="coffee-journal-entry-foot">
                            <span>{drinkBadge.label}</span>
                            <span>{entry.source === "review" ? "Shared review" : "Private log"}</span>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}

              <div className="coffee-journal-footer-note">
                <span>Quiet coffee lesson</span>
                <strong>{insight.glossaryTip}</strong>
              </div>
            </>
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
      </section>
    </div>
  );
}
