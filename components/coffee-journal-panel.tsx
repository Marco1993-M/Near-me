"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import type { CSSProperties } from "react";
import {
  getCoffeeJournalInsight,
  getStoredCoffeeJournal,
  getStoredCoffeeJournalServerSnapshot,
  removeCoffeeJournalEntry,
  subscribeToCoffeeJournal,
} from "@/lib/coffee-journal";
import {
  getStoredCoffeeProfileState,
  getStoredCoffeeProfileStateServerSnapshot,
  subscribeToCoffeeProfile,
} from "@/lib/coffee-profiler";

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

function getCanvasWheelTitleSize(label: string | null) {
  const length = label?.length ?? 0;
  if (length >= 16) {
    return 38;
  }
  if (length >= 13) {
    return 44;
  }
  if (length >= 10) {
    return 48;
  }
  if (length >= 8) {
    return 54;
  }
  return 64;
}

function getCanvasWheelSubtitleSize(label: string | null) {
  const length = label?.length ?? 0;
  if (length >= 24) {
    return 14;
  }
  if (length >= 20) {
    return 16;
  }
  if (length >= 18) {
    return 17;
  }
  if (length >= 14) {
    return 18;
  }
  return 22;
}

function getTastePullLabel(value: number, index: number) {
  if (index === 0) {
    return "Strongest lane right now";
  }
  if (value >= 0.66) {
    return "Strong pull right now";
  }
  if (value >= 0.42) {
    return "Clear pull right now";
  }
  return "Starting to show up";
}

function getRepeatedSignal(entries: ReturnType<typeof getStoredCoffeeJournal>) {
  const drinkCounts = new Map<string, number>();
  const tagCounts = new Map<string, number>();
  const cafeCounts = new Map<string, number>();

  for (const entry of entries) {
    drinkCounts.set(entry.drink, (drinkCounts.get(entry.drink) ?? 0) + 1);
    cafeCounts.set(entry.cafeName, (cafeCounts.get(entry.cafeName) ?? 0) + 1);

    for (const tag of entry.tags) {
      const normalizedTag = tag.toLowerCase();
      tagCounts.set(normalizedTag, (tagCounts.get(normalizedTag) ?? 0) + 1);
    }
  }

  const strongestDrink = Array.from(drinkCounts.entries()).sort((left, right) => right[1] - left[1])[0] ?? null;
  const strongestTag = Array.from(tagCounts.entries()).sort((left, right) => right[1] - left[1])[0] ?? null;
  const strongestCafe = Array.from(cafeCounts.entries()).sort((left, right) => right[1] - left[1])[0] ?? null;

  if (strongestTag && strongestTag[1] >= 2) {
    return titleCase(strongestTag[0]);
  }
  if (strongestDrink && strongestDrink[1] >= 2) {
    return getDrinkFamilyLabel(strongestDrink[0]) ?? strongestDrink[0];
  }
  if (strongestCafe && strongestCafe[1] >= 2) {
    return strongestCafe[0];
  }

  return null;
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

const TASTE_SETUP_SHARE_URL = "https://www.near-me.cafe/?intent=taste";

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
  const profileState = useSyncExternalStore(
    subscribeToCoffeeProfile,
    getStoredCoffeeProfileState,
    getStoredCoffeeProfileStateServerSnapshot,
  );

  const insight = useMemo(() => getCoffeeJournalInsight(entries, profileState), [entries, profileState]);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [openEntryMenuId, setOpenEntryMenuId] = useState<string | null>(null);
  const leadingTags = insight.topTags.slice(0, 3);
  const journalSections = useMemo(() => getJournalSections(entries), [entries]);
  const favoriteDrinkFamily = getDrinkFamilyLabel(insight.favoriteDrink);
  const recentDrinkFamily = getDrinkFamilyLabel(insight.recentFavoriteDrink);
  const repeatedSignal = useMemo(() => getRepeatedSignal(entries), [entries]);
  const hasStarterRead = entries.length >= 3;
  const hasMeaningfulStory = entries.length >= 5 && Boolean(repeatedSignal);
  const strongestSignal =
    repeatedSignal ??
    (insight.primaryTaste && favoriteDrinkFamily ? `${insight.primaryTaste} ${favoriteDrinkFamily}` : null) ??
    insight.primaryTaste ??
    favoriteDrinkFamily ??
    "Still learning";
  const strongestEvidence = insight.tasteDrivers[0]?.cafeName ?? insight.topCafe ?? "A few more logs will sharpen this";
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
      moment.shareText,
      moment.body,
      leadingTaste ? `Taste read: ${leadingTaste}.` : null,
      favoriteDrinkLine,
      tagsLine,
      "Built from my Near Me Coffee Journal.",
      `Curious what your coffee taste looks like? Find yours at ${TASTE_SETUP_SHARE_URL}`,
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

    const wash = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    wash.addColorStop(0, "#f8fbf6");
    wash.addColorStop(0.46, "#fffdf8");
    wash.addColorStop(1, "#f7f2ea");
    context.fillStyle = wash;
    context.fillRect(0, 0, canvas.width, canvas.height);

    const mintGlow = context.createRadialGradient(180, 180, 0, 180, 180, 520);
    mintGlow.addColorStop(0, "rgba(199, 245, 211, 0.34)");
    mintGlow.addColorStop(1, "rgba(255, 253, 248, 0)");
    context.fillStyle = mintGlow;
    context.fillRect(0, 0, canvas.width, canvas.height);

    const oatGlow = context.createRadialGradient(940, 1140, 0, 940, 1140, 420);
    oatGlow.addColorStop(0, "rgba(236, 214, 186, 0.26)");
    oatGlow.addColorStop(1, "rgba(255, 253, 248, 0)");
    context.fillStyle = oatGlow;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = "#142018";
    context.font = "700 52px Georgia, serif";
    context.fillText("Near Me", 88, 106);

    context.fillStyle = "rgba(20, 32, 24, 0.58)";
    context.font = "700 24px Arial, sans-serif";
    context.fillText("Coffee Journal", 90, 152);

    context.fillStyle = "rgba(20, 32, 24, 0.4)";
    context.font = "600 20px Arial, sans-serif";
    context.fillText("Private coffee memory", 90, 184);

    const cardX = 74;
    const cardY = 222;
    const cardWidth = canvas.width - cardX * 2;
    const cardHeight = 1016;
    context.shadowColor = "rgba(33, 26, 16, 0.08)";
    context.shadowBlur = 48;
    context.shadowOffsetY = 22;
    context.fillStyle = "rgba(255,255,252,0.92)";
    context.strokeStyle = "rgba(20, 32, 24, 0.07)";
    context.lineWidth = 2;
    context.beginPath();
    context.roundRect(cardX, cardY, cardWidth, cardHeight, 46);
    context.fill();
    context.stroke();
    context.shadowColor = "transparent";

    const sheen = context.createLinearGradient(cardX, cardY, cardX, cardY + cardHeight);
    sheen.addColorStop(0, "rgba(255,255,255,0.32)");
    sheen.addColorStop(1, "rgba(255,255,255,0.04)");
    context.fillStyle = sheen;
    context.beginPath();
    context.roundRect(cardX + 2, cardY + 2, cardWidth - 4, cardHeight - 4, 44);
    context.fill();

    const shareableLabel = "SHAREABLE MOMENT";
    context.font = "700 21px Arial, sans-serif";
    const shareableLabelWidth = context.measureText(shareableLabel).width + 56;
    context.fillStyle = "rgba(20, 32, 24, 0.08)";
    context.beginPath();
    context.roundRect(cardX + 42, cardY + 42, shareableLabelWidth, 52, 999);
    context.fill();
    context.fillStyle = "#214d2f";
    context.fillText(shareableLabel, cardX + 66, cardY + 75);

    const centerX = canvas.width / 2;
    const wheelY = 468;
    const outerRadius = 184;
    const innerRadius = 106;
    const fullArc = Math.PI * 2;

    context.fillStyle = "rgba(20, 32, 24, 0.04)";
    context.beginPath();
    context.arc(centerX, wheelY, outerRadius + 18, 0, fullArc);
    context.fill();

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

    context.strokeStyle = "rgba(255, 255, 255, 0.8)";
    context.lineWidth = 8;
    context.beginPath();
    context.arc(centerX, wheelY, outerRadius + 2, 0, fullArc);
    context.stroke();

    context.fillStyle = "#fffaf3";
    context.beginPath();
    context.arc(centerX, wheelY, innerRadius, 0, fullArc);
    context.fill();

    context.fillStyle = "rgba(20, 32, 24, 0.5)";
    context.textAlign = "center";
    context.font = "700 22px Arial, sans-serif";
    context.fillText("YOUR TASTE", centerX, wheelY - 30);
    context.fillStyle = "#142018";
    context.font = `700 ${getCanvasWheelTitleSize(insight.primaryTaste)}px Georgia, serif`;
    context.fillText(insight.primaryTaste ?? "Tasting", centerX, wheelY + 22);
    context.fillStyle = "rgba(20, 32, 24, 0.58)";
    context.font = `700 ${getCanvasWheelSubtitleSize(
      insight.secondaryTaste ? `${insight.secondaryTaste} lean` : "Still sharpening",
    )}px Georgia, serif`;
    const subtitleLines = wrapCanvasText(
      context,
      insight.secondaryTaste ? `${insight.secondaryTaste} lean` : "Still sharpening",
      150,
    );
    subtitleLines.slice(0, 2).forEach((line, index) => {
      context.fillText(line, centerX, wheelY + 58 + index * 18);
    });

    context.fillStyle = "rgba(20, 32, 24, 0.06)";
    const editorialBlockX = cardX + 82;
    const editorialBlockWidth = cardWidth - 164;
    context.beginPath();
    context.roundRect(editorialBlockX, 704, editorialBlockWidth, 372, 32);
    context.fill();

    context.textAlign = "left";
    context.fillStyle = "rgba(20, 32, 24, 0.5)";
    context.font = "700 22px Arial, sans-serif";
    context.fillText(moment.eyebrow.toUpperCase(), editorialBlockX + 34, 748);

    context.fillStyle = "#142018";
    context.font = "700 64px Georgia, serif";
    const titleLines = wrapCanvasText(context, moment.title, editorialBlockWidth - 68);
    titleLines.slice(0, 3).forEach((line, index) => {
      context.fillText(line, editorialBlockX + 34, 826 + index * 74);
    });

    context.fillStyle = "rgba(20, 32, 24, 0.64)";
    context.font = "500 29px Arial, sans-serif";
    const bodyLines = wrapCanvasText(context, moment.body, editorialBlockWidth - 68);
    bodyLines.slice(0, 3).forEach((line, index) => {
      context.fillText(line, editorialBlockX + 34, 1008 + index * 42);
    });

    const chipY = 1128;
    const chipValues = [
      insight.tasteMood,
      favoriteDrinkFamily ? favoriteDrinkFamily.replace(/^\w/, (char) => char.toUpperCase()) : null,
      leadingTags[0] ?? null,
    ].filter(Boolean) as string[];

    let chipX = 110;
    context.font = "700 22px Arial, sans-serif";
    for (const chip of chipValues.slice(0, 3)) {
      const chipWidth = context.measureText(chip).width + 44;
      context.fillStyle = "rgba(199, 245, 211, 0.34)";
      context.beginPath();
      context.roundRect(chipX, chipY, chipWidth, 48, 999);
      context.fill();
      context.fillStyle = "#214d2f";
      context.fillText(chip, chipX + 22, chipY + 32);
      chipX += chipWidth + 12;
    }

    context.strokeStyle = "rgba(20, 32, 24, 0.08)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(cardX + 42, 1198);
    context.lineTo(cardX + cardWidth - 42, 1198);
    context.stroke();

    context.fillStyle = "#142018";
    context.font = "700 26px Georgia, serif";
    context.fillText("near-me.cafe/?intent=taste", 116, 1260);
    context.textAlign = "right";
    context.fillStyle = "rgba(20, 32, 24, 0.56)";
    context.font = "600 22px Arial, sans-serif";
    context.fillText("Find your taste. Discover better coffee.", canvas.width - 116, 1258);
    context.textAlign = "left";

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

  function handleDeleteEntry(entry: ReturnType<typeof getStoredCoffeeJournal>[number]) {
    const message =
      entry.source === "review"
        ? "Remove this from your Journal? Your public review stays published."
        : "Delete this log? This removes it from your Journal and taste read.";

    if (!window.confirm(message)) {
      return;
    }

    removeCoffeeJournalEntry(entry.id);
    setOpenEntryMenuId(null);
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
                <span>Based on</span>
                <strong>{insight.entryCount === 1 ? "1 cup" : `${insight.entryCount} cups`}</strong>
              </article>
              <article className="coffee-journal-summary-card">
                <span>Strongest signal</span>
                <strong>{strongestSignal}</strong>
              </article>
              <article className="coffee-journal-summary-card">
                <span>Best evidence</span>
                <strong>{strongestEvidence}</strong>
              </article>
            </div>
          </section>

          {hasStarterRead ? (
            <section className="coffee-journal-spectrum" aria-label="Taste wheel notes">
              <div className="coffee-journal-spectrum-head">
                <span>Near Me wheel</span>
                <strong>{insight.primaryTaste && insight.secondaryTaste ? `${insight.primaryTaste} + ${insight.secondaryTaste}` : insight.primaryTaste ?? "Still learning"}</strong>
              </div>

              <div className="coffee-journal-spectrum-grid">
                {visibleWheelTags.map((segment, index) => (
                  <article className="coffee-journal-spectrum-card" key={segment.key}>
                    <div
                      className="coffee-journal-spectrum-swatch"
                      style={{ backgroundColor: segment.color }}
                      aria-hidden="true"
                    />
                    <div className="coffee-journal-spectrum-copy">
                      <strong>{segment.label}</strong>
                      <span>{getTastePullLabel(segment.value, index)}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {hasMeaningfulStory && insight.tasteDrivers.length > 0 ? (
            <section className="coffee-journal-drivers" aria-label="What changed your taste">
              <div className="coffee-journal-spectrum-head">
                <span>What changed your taste</span>
                <strong>The cups moving your wheel most</strong>
              </div>

              <div className="coffee-journal-driver-grid">
                {insight.tasteDrivers.map((driver) => (
                  <article className="coffee-journal-driver-card" key={driver.id}>
                    <div className="coffee-journal-driver-topline">
                      <div>
                        <span>{driver.cafeName}</span>
                        <strong>{driver.headline}</strong>
                      </div>
                      <div className="coffee-journal-driver-score">
                        <strong>{driver.rating}</strong>
                        <span>/10</span>
                      </div>
                    </div>

                    <p>{driver.body}</p>

                    <div className="coffee-journal-driver-meter">
                      <div className="coffee-journal-driver-meter-track" aria-hidden="true">
                        <div
                          className="coffee-journal-driver-meter-fill"
                          style={{ width: `${Math.max(18, Math.round(driver.impact * 100))}%` }}
                        />
                      </div>
                      <span>{driver.impact >= 0.72 ? "Strong taste pull" : "Taste signal"}</span>
                    </div>

                    <div className="coffee-journal-driver-foot">
                      <span>
                        {[driver.drink, formatRelativeDate(driver.createdAt)].filter(Boolean).join(" · ")}
                      </span>
                      {driver.tags.length > 0 ? (
                        <div className="diesel-selection-tags">
                          {driver.tags.slice(0, 2).map((tag) => (
                            <span className="diesel-selection-tag" key={`${driver.id}-${tag}`}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {hasMeaningfulStory && (insight.patternInsights.length > 0 || insight.profileAlignment) ? (
            <section className="coffee-journal-insights" aria-label="Journal insights">
              <div className="coffee-journal-spectrum-head">
                <span>Pattern notes</span>
                <strong>What Near Me is noticing</strong>
              </div>
              <div className="coffee-journal-insights-grid">
                {insight.profileAlignment ? (
                  <article
                    className={`coffee-journal-evolution-card coffee-journal-profile-alignment is-${insight.profileAlignment.status}`}
                  >
                    <span>{insight.profileAlignment.eyebrow}</span>
                    <strong>{insight.profileAlignment.title}</strong>
                    <span>{insight.profileAlignment.body}</span>
                  </article>
                ) : null}
                {insight.patternInsights.map((item) => (
                  <article className="coffee-journal-insight-card" key={item}>
                    <strong>{item}</strong>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {hasMeaningfulStory ? (
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
          ) : null}

          <article className="coffee-journal-pulse">
            <span>Near Me is learning</span>
            <strong>{insight.learningPrompt}</strong>
          </article>

          {hasMeaningfulStory ? (
            <section className="coffee-journal-share" aria-label="Shareable journal moments">
              <div className="coffee-journal-spectrum-head">
                <span>Shareable moments</span>
                <strong>Your taste read has a clear story</strong>
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
          ) : null}
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

                            <div className="coffee-journal-entry-actions">
                              <button
                                className="coffee-journal-entry-menu-button"
                                type="button"
                                aria-label={`More actions for ${entry.cafeName}`}
                                aria-expanded={openEntryMenuId === entry.id}
                                onClick={() => setOpenEntryMenuId((current) => (current === entry.id ? null : entry.id))}
                              >
                                ...
                              </button>

                              {openEntryMenuId === entry.id ? (
                                <div className="coffee-journal-entry-menu">
                                  <button type="button" onClick={() => handleDeleteEntry(entry)}>
                                    {entry.source === "review" ? "Remove from Journal" : "Delete log"}
                                  </button>
                                </div>
                              ) : null}
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
