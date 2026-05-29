"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { CSSProperties } from "react";
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

function getWheelColor(color: string, value: number) {
  const fade = Math.round((1 - value) * 62);
  return `color-mix(in srgb, ${color} ${100 - fade}%, rgba(255, 250, 242, 0.96))`;
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
  const wheelGradient = useMemo(() => {
    const total = insight.tasteWheel.length || 1;
    return `conic-gradient(${insight.tasteWheel
      .map((segment, index) => {
        const start = (index / total) * 360;
        const end = ((index + 1) / total) * 360;
        const segmentColor = getWheelColor(segment.color, segment.value);
        return `${segmentColor} ${start}deg ${end}deg`;
      })
      .join(", ")})`;
  }, [insight.tasteWheel]);
  const visibleWheelTags = insight.tasteWheel
    .filter((segment) => segment.value >= 0.42)
    .sort((left, right) => right.value - left.value)
    .slice(0, 3);

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
              <div className="coffee-journal-hero-wheel">
                <div className="coffee-journal-wheel-wrap">
                  <div
                    className="coffee-journal-wheel"
                    style={
                      {
                        backgroundImage: wheelGradient,
                        "--wheel-highlight": insight.tasteWheel[0]?.color ?? "#c7f5d3",
                      } as CSSProperties
                    }
                    aria-hidden="true"
                  >
                    <div className="coffee-journal-wheel-core">
                      <span>Your taste</span>
                      <strong>{insight.primaryTaste ?? "In progress"}</strong>
                      <small>{insight.secondaryTaste ? `${insight.secondaryTaste} lean` : "Still sharpening"}</small>
                    </div>
                  </div>
                </div>

                <div className="coffee-journal-hero-copy">
                  <div className="coffee-journal-hero-head">
                    <span>Taste read</span>
                  </div>
                  <strong>{insight.tasteMood}</strong>
                  <p>{insight.favoriteDrink ? `${insight.favoriteDrink} is your current go-to.` : "Your strongest taste lanes will settle in as you log more cups."}</p>
                </div>
              </div>

              <div className="coffee-journal-hero-footer">
                <div className="coffee-journal-hero-note">
                  <span>Right now</span>
                  <strong>
                    {insight.favoriteDrink
                      ? `${insight.primaryTaste?.toLowerCase() ?? "coffee"} notes are leading your ${insight.favoriteDrink.toLowerCase()} habit.`
                      : "Near Me is starting to map the styles you naturally return to."}
                  </strong>
                </div>

                {leadingTags.length > 0 ? (
                  <div className="diesel-selection-tags">
                    {leadingTags.map((tag) => (
                      <span className="diesel-selection-tag" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
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

          <section className="coffee-journal-spectrum" aria-label="Taste wheel notes">
            <div className="coffee-journal-spectrum-head">
              <span>Near Me wheel</span>
              <strong>{insight.primaryTaste && insight.secondaryTaste ? `${insight.primaryTaste} + ${insight.secondaryTaste}` : insight.primaryTaste ?? "Still learning"}</strong>
            </div>

            <div className="coffee-journal-spectrum-grid">
              {visibleWheelTags.map((segment) => (
                <article className="coffee-journal-spectrum-card" key={segment.key}>
                  <div
                    className="coffee-journal-spectrum-swatch"
                    style={{ backgroundColor: segment.color }}
                    aria-hidden="true"
                  />
                  <div className="coffee-journal-spectrum-copy">
                    <strong>{segment.label}</strong>
                    <span>{Math.round(segment.value * 100)}% pull right now</span>
                  </div>
                </article>
              ))}
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
