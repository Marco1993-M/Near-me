"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
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
      return { short: "ES", label: "Espresso-based" };
    case "Milk drink":
      return { short: "MK", label: "Milk-based" };
    case "Filter":
      return { short: "FL", label: "Filter coffee" };
    case "Cold":
      return { short: "CL", label: "Cold coffee" };
    case "Seasonal":
      return { short: "SE", label: "Seasonal pick" };
    default:
      return { short: "CF", label: "Coffee" };
  }
}

function getDrinkFamilyLabel(drink: string | null) {
  if (!drink) {
    return null;
  }

  if (drink === "Espresso") {
    return "espresso-based drinks";
  }
  if (drink === "Milk drink") {
    return "milk drinks";
  }
  if (drink === "Filter") {
    return "filter coffees";
  }
  if (drink === "Cold") {
    return "cold coffees";
  }
  if (drink === "Seasonal") {
    return "seasonal drinks";
  }

  return drink.toLowerCase();
}

function getWheelTitleSize(label: string | null) {
  const length = label?.length ?? 0;
  if (length >= 10) {
    return "0.82rem";
  }
  if (length >= 8) {
    return "0.9rem";
  }
  return "0.98rem";
}

function getWheelSubtitleSize(label: string | null) {
  const length = label?.length ?? 0;
  if (length >= 14) {
    return "0.54rem";
  }
  if (length >= 10) {
    return "0.58rem";
  }
  return "0.62rem";
}

function getWheelColor(color: string, value: number) {
  const fade = Math.round((1 - value) * 62);
  return `color-mix(in srgb, ${color} ${100 - fade}%, rgba(255, 250, 242, 0.96))`;
}

function wrapCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth || !currentLine) {
      currentLine = candidate;
      continue;
    }

    lines.push(currentLine);
    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
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
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const leadingTags = insight.topTags.slice(0, 3);
  const journalSections = useMemo(() => getJournalSections(entries), [entries]);
  const favoriteDrinkFamily = getDrinkFamilyLabel(insight.favoriteDrink);
  const recentDrinkFamily = getDrinkFamilyLabel(insight.recentFavoriteDrink);
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
  const evolutionLanes = useMemo(() => {
    const recentMap = new Map(insight.recentTasteWheel.map((segment) => [segment.key, segment.value]));

    return insight.tasteWheel
      .map((segment) => {
        const recentValue = recentMap.get(segment.key) ?? 0;
        const delta = Number((recentValue - segment.value).toFixed(2));
        return {
          ...segment,
          recentValue,
          delta,
        };
      })
      .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta) || right.recentValue - left.recentValue)
      .slice(0, 3);
  }, [insight.recentTasteWheel, insight.tasteWheel]);

  function buildShareText(moment: (typeof insight.shareMoments)[number]) {
    const leadingTaste = [insight.primaryTaste, insight.secondaryTaste ? `${insight.secondaryTaste} lean` : null]
      .filter(Boolean)
      .join(" · ");
    const favoriteDrinkLine = favoriteDrinkFamily ? `Usually drawn to ${favoriteDrinkFamily}.` : null;
    const tagsLine = leadingTags.length > 0 ? `Top notes: ${leadingTags.join(", ")}.` : null;

    return [
      moment.title,
      moment.body,
      leadingTaste ? `Taste read: ${leadingTaste}.` : null,
      favoriteDrinkLine,
      tagsLine,
      "Built from my Near Me Coffee Journal.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  async function buildShareCard(moment: (typeof insight.shareMoments)[number]) {
    if (typeof window === "undefined") {
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const context = canvas.getContext("2d");

    if (!context) {
      return null;
    }

    context.fillStyle = "#fffdf8";
    context.fillRect(0, 0, canvas.width, canvas.height);

    const glow = context.createRadialGradient(200, 180, 0, 200, 180, 520);
    glow.addColorStop(0, "rgba(199, 245, 211, 0.28)");
    glow.addColorStop(1, "rgba(255, 253, 248, 0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = "#142018";
    context.font = "700 34px Georgia, serif";
    context.fillText("Near Me", 92, 104);

    context.fillStyle = "rgba(20, 32, 24, 0.58)";
    context.font = "700 24px Arial, sans-serif";
    context.fillText("Coffee Journal", 92, 148);

    const cardX = 74;
    const cardY = 196;
    const cardWidth = canvas.width - cardX * 2;
    const cardHeight = 964;
    context.fillStyle = "rgba(255,255,252,0.9)";
    context.strokeStyle = "rgba(20, 32, 24, 0.08)";
    context.lineWidth = 2;
    context.beginPath();
    context.roundRect(cardX, cardY, cardWidth, cardHeight, 42);
    context.fill();
    context.stroke();

    const centerX = canvas.width / 2;
    const wheelY = 420;
    const outerRadius = 180;
    const innerRadius = 102;
    const fullArc = Math.PI * 2;

    let startAngle = -Math.PI / 2;
    for (const segment of insight.tasteWheel) {
      const segmentArc = fullArc / insight.tasteWheel.length;
      context.beginPath();
      context.moveTo(centerX, wheelY);
      context.arc(centerX, wheelY, outerRadius, startAngle, startAngle + segmentArc);
      context.closePath();
      context.fillStyle = getWheelColor(segment.color, segment.value);
      context.fill();
      startAngle += segmentArc;
    }

    context.fillStyle = "#fffaf3";
    context.beginPath();
    context.arc(centerX, wheelY, innerRadius, 0, fullArc);
    context.fill();

    context.fillStyle = "rgba(20, 32, 24, 0.5)";
    context.textAlign = "center";
    context.font = "700 26px Arial, sans-serif";
    context.fillText("YOUR TASTE", centerX, wheelY - 28);
    context.fillStyle = "#142018";
    context.font = "700 72px Georgia, serif";
    context.fillText(insight.primaryTaste ?? "Tasting", centerX, wheelY + 40);
    context.fillStyle = "rgba(20, 32, 24, 0.58)";
    context.font = "700 28px Georgia, serif";
    context.fillText(insight.secondaryTaste ? `${insight.secondaryTaste} lean` : "Still sharpening", centerX, wheelY + 88);

    context.textAlign = "left";
    context.fillStyle = "rgba(20, 32, 24, 0.5)";
    context.font = "700 22px Arial, sans-serif";
    context.fillText(moment.eyebrow.toUpperCase(), 110, 716);

    context.fillStyle = "#142018";
    context.font = "700 64px Georgia, serif";
    const titleLines = wrapCanvasText(context, moment.title, 820);
    titleLines.slice(0, 3).forEach((line, index) => {
      context.fillText(line, 110, 794 + index * 74);
    });

    context.fillStyle = "rgba(20, 32, 24, 0.64)";
    context.font = "500 30px Arial, sans-serif";
    const bodyLines = wrapCanvasText(context, moment.body, 820);
    bodyLines.slice(0, 3).forEach((line, index) => {
      context.fillText(line, 110, 980 + index * 42);
    });

    const chipY = 1112;
    const chipValues = [
      insight.tasteMood,
      favoriteDrinkFamily ? favoriteDrinkFamily.replace(/^\w/, (char) => char.toUpperCase()) : null,
      leadingTags[0] ?? null,
    ].filter(Boolean) as string[];

    let chipX = 110;
    context.font = "700 22px Arial, sans-serif";
    for (const chip of chipValues.slice(0, 3)) {
      const chipWidth = context.measureText(chip).width + 42;
      context.fillStyle = "rgba(199, 245, 211, 0.3)";
      context.beginPath();
      context.roundRect(chipX, chipY, chipWidth, 46, 999);
      context.fill();
      context.fillStyle = "#214d2f";
      context.fillText(chip, chipX + 21, chipY + 31);
      chipX += chipWidth + 12;
    }

    context.fillStyle = "rgba(20, 32, 24, 0.42)";
    context.font = "600 24px Arial, sans-serif";
    context.fillText("near-me.cafe", 110, 1260);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((nextBlob) => resolve(nextBlob), "image/png");
    });

    if (!blob) {
      return null;
    }

    return new File([blob], `near-me-coffee-journal-${moment.id}.png`, {
      type: "image/png",
    });
  }

  async function handleShareMoment(moment: (typeof insight.shareMoments)[number]) {
    const shareText = buildShareText(moment);

    try {
      const shareCard = await buildShareCard(moment);

      if (
        typeof navigator !== "undefined" &&
        navigator.share &&
        shareCard &&
        "canShare" in navigator &&
        navigator.canShare({ files: [shareCard] })
      ) {
        await navigator.share({
          title: "Near Me Coffee Journal",
          text: shareText,
          files: [shareCard],
        });
        setShareFeedback(`Shared card: ${moment.eyebrow}`);
        window.setTimeout(() => setShareFeedback(null), 2200);
        return;
      }

      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: "Near Me Coffee Journal",
          text: shareText,
        });
        setShareFeedback(`Shared: ${moment.eyebrow}`);
        window.setTimeout(() => setShareFeedback(null), 2200);
        return;
      }

      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        setShareFeedback(`Copied: ${moment.eyebrow}`);
        window.setTimeout(() => setShareFeedback(null), 2200);
        return;
      }

      setShareFeedback("Sharing unavailable on this device");
      window.setTimeout(() => setShareFeedback(null), 2200);
    } catch {
      setShareFeedback("Could not share right now");
      window.setTimeout(() => setShareFeedback(null), 2200);
    }
  }

  return (
    <div className="map-journal-shell fade-slide-in">
      <section className="map-journal-panel" role="dialog" aria-modal="false" aria-label="Your taste">
        <div className="coffee-journal-static">
          <div className="map-top-picks-head">
            <div className="map-top-picks-title">
              <strong>Your taste</strong>
              <span>Journal, taste memory, and how your coffee lean is evolving.</span>
            </div>
            <div className="map-top-picks-head-actions">
              {onLogCurrent ? (
                <button className="map-top-picks-profile-button" type="button" onClick={onLogCurrent}>
                  {currentCafeName ? `Log ${currentCafeName}` : "Log a visit"}
                </button>
              ) : null}
              <button className="map-search-close" type="button" onClick={onClose} aria-label="Close your taste">
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
                        "--wheel-title-size": getWheelTitleSize(insight.primaryTaste),
                        "--wheel-subtitle-size": getWheelSubtitleSize(
                          insight.secondaryTaste ? `${insight.secondaryTaste} lean` : null,
                        ),
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
                  <p>{favoriteDrinkFamily ? `${favoriteDrinkFamily} are your current go-to.` : "Your strongest taste lanes will settle in as you log more cups."}</p>
                </div>
              </div>

              <div className="coffee-journal-hero-footer">
                <div className="coffee-journal-hero-note">
                  <span>Right now</span>
                  <strong>
                    {favoriteDrinkFamily
                      ? `${insight.primaryTaste?.toLowerCase() ?? "coffee"} notes are leading what you enjoy in ${favoriteDrinkFamily}.`
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

                {insight.milestoneLabel ? (
                  <div className="coffee-journal-milestone">
                    <span>{insight.milestoneLabel}</span>
                    {insight.milestoneProgress ? <strong>{insight.milestoneProgress}</strong> : null}
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
              <article className="coffee-journal-summary-card">
                <span>Repeat cafe</span>
                <strong>{insight.topCafe ?? "Still learning"}</strong>
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

          {insight.patternInsights.length > 0 ? (
            <section className="coffee-journal-insights" aria-label="Journal insights">
              <div className="coffee-journal-spectrum-head">
                <span>Pattern notes</span>
                <strong>What Near Me is noticing</strong>
              </div>
              <div className="coffee-journal-insights-grid">
                {insight.patternInsights.map((item) => (
                  <article className="coffee-journal-insight-card" key={item}>
                    <strong>{item}</strong>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section className="coffee-journal-evolution" aria-label="Taste evolution">
            <div className="coffee-journal-spectrum-head">
              <span>Taste evolution</span>
              <strong>{recentDrinkFamily ? `${recentDrinkFamily} lately` : "Still taking shape"}</strong>
            </div>
            <div className="coffee-journal-evolution-card">
              <strong>{insight.evolutionSummary}</strong>
              {insight.latestHighlight ? <span>Recent standout: {insight.latestHighlight}</span> : null}
            </div>
            <div className="coffee-journal-evolution-lanes">
              {evolutionLanes.map((segment) => {
                const trendLabel =
                  segment.delta > 0.08 ? "Rising lately" : segment.delta < -0.08 ? "Quieter lately" : "Holding steady";

                return (
                  <article className="coffee-journal-evolution-lane" key={segment.key}>
                    <div className="coffee-journal-evolution-lane-head">
                      <div className="coffee-journal-evolution-lane-title">
                        <span
                          className="coffee-journal-evolution-lane-dot"
                          style={{ backgroundColor: segment.color }}
                          aria-hidden="true"
                        />
                        <strong>{segment.label}</strong>
                      </div>
                      <span>{trendLabel}</span>
                    </div>
                    <div className="coffee-journal-evolution-bar-stack" aria-hidden="true">
                      <div className="coffee-journal-evolution-bar-track coffee-journal-evolution-bar-track-recent">
                        <div
                          className="coffee-journal-evolution-bar-fill coffee-journal-evolution-bar-fill-recent"
                          style={{
                            width: `${Math.max(12, Math.round(segment.recentValue * 100))}%`,
                            backgroundColor: segment.color,
                          }}
                        />
                      </div>
                      <div className="coffee-journal-evolution-bar-track">
                        <div
                          className="coffee-journal-evolution-bar-fill"
                          style={{
                            width: `${Math.max(12, Math.round(segment.value * 100))}%`,
                            backgroundColor: `color-mix(in srgb, ${segment.color} 42%, rgba(255, 255, 255, 0.88))`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="coffee-journal-evolution-legend">
                      <span>Recent</span>
                      <span>All time</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <article className="coffee-journal-pulse">
            <span>Near Me is learning</span>
            <strong>{insight.learningPrompt}</strong>
          </article>

          <section className="coffee-journal-share" aria-label="Shareable journal moments">
            <div className="coffee-journal-spectrum-head">
              <span>Shareable moments</span>
              <strong>Little snapshots of your coffee story</strong>
            </div>

            <div className="coffee-journal-share-grid">
              {insight.shareMoments.map((moment) => (
                <article className="coffee-journal-share-card" key={moment.id}>
                  <span>{moment.eyebrow}</span>
                  <strong>{moment.title}</strong>
                  <p>{moment.body}</p>
                  <button
                    className="coffee-journal-share-button"
                    type="button"
                    onClick={() => void handleShareMoment(moment)}
                  >
                    Share card
                  </button>
                </article>
              ))}
            </div>

            {shareFeedback ? <div className="coffee-journal-share-feedback">{shareFeedback}</div> : null}
          </section>
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
