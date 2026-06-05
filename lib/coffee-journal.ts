import type { Cafe, FallbackPlace } from "@/types/cafe";

export type CoffeeJournalEntry = {
  id: string;
  reviewId?: string;
  cafeId: string | null;
  cafeName: string;
  city: string;
  drink: string;
  rating: number;
  note: string;
  tags: string[];
  createdAt: string;
  source: "manual" | "review";
};

export type CoffeeJournalInsight = {
  entryCount: number;
  favoriteDrink: string | null;
  topTags: string[];
  cityCount: number;
  averageRating: number | null;
  tasteMood: string;
  tasteWheel: {
    key: "chocolatey" | "nutty" | "bright" | "fruity" | "floral" | "bold";
    label: string;
    shortLabel: string;
    value: number;
    color: string;
  }[];
  recentTasteWheel: {
    key: "chocolatey" | "nutty" | "bright" | "fruity" | "floral" | "bold";
    label: string;
    shortLabel: string;
    value: number;
    color: string;
  }[];
  primaryTaste: string | null;
  secondaryTaste: string | null;
  topCafe: string | null;
  recentFavoriteDrink: string | null;
  milestoneLabel: string | null;
  milestoneProgress: string | null;
  evolutionSummary: string;
  latestHighlight: string | null;
  patternInsights: string[];
  learningPrompt: string;
  glossaryTip: string;
  homeCue: string;
  shareMoments: Array<{
    id: "taste-read" | "taste-shift" | "standout-cup";
    eyebrow: string;
    title: string;
    body: string;
    shareText: string;
  }>;
};

export type CafeJournalMemory = {
  visitCount: number;
  averageRating: number | null;
  lastDrink: string | null;
  topTags: string[];
  latestNote: string | null;
  latestVisitedAt: string | null;
};

export type JournalCafeMatch = {
  score: number;
  label: string;
  reason: string;
  support: string | null;
};

export const COFFEE_JOURNAL_STORAGE_KEY = "near-me-coffee-journal";
export const COFFEE_JOURNAL_EVENT = "near-me-coffee-journal-updated";

const SERVER_JOURNAL_SNAPSHOT: CoffeeJournalEntry[] = [];

let cachedJournalSnapshot: CoffeeJournalEntry[] | undefined;
let cachedJournalRaw: string | null | undefined;

type JournalInput = {
  cafe?: Cafe | null;
  place?: FallbackPlace | null;
  drink: string;
  rating: number;
  note: string;
  tags: string[];
  source: "manual" | "review";
};

const glossaryByTag: Record<string, string> = {
  bright: "Bright usually points to acidity or liveliness rather than bitterness.",
  fruity: "Fruity notes often show up as berry, citrus, or tropical character in the cup.",
  floral: "Floral coffees can feel tea-like, delicate, and aromatic rather than heavy.",
  chocolatey: "Chocolatey usually signals deeper sweetness and an easier milk-drink fit.",
  smooth: "Smooth often means no harsh edge is dominating the sip.",
  bold: "Bold usually means more intensity, heavier roast feel, or a stronger espresso impression.",
  sweet: "Sweet does not mean sugary; it often means caramel, honey, or ripe fruit balance.",
  clean: "Clean usually means the flavors feel separated and tidy rather than muddy.",
};

const TASTE_WHEEL_META = [
  { key: "chocolatey", label: "Chocolatey", shortLabel: "Choc", color: "#7c4a2d" },
  { key: "nutty", label: "Nutty", shortLabel: "Nut", color: "#b6844f" },
  { key: "bright", label: "Bright", shortLabel: "Bright", color: "#f0c848" },
  { key: "fruity", label: "Fruity", shortLabel: "Fruit", color: "#ef8d73" },
  { key: "floral", label: "Floral", shortLabel: "Floral", color: "#d69adf" },
  { key: "bold", label: "Bold", shortLabel: "Bold", color: "#62784b" },
] as const;

type TasteWheelKey = (typeof TASTE_WHEEL_META)[number]["key"];
type TasteWheelSegment = {
  key: TasteWheelKey;
  label: string;
  shortLabel: string;
  value: number;
  color: string;
};

function normalizeEntries(input: unknown): CoffeeJournalEntry[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const normalizedEntries = input
    .map((entry): CoffeeJournalEntry | null => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const candidate = entry as Partial<CoffeeJournalEntry>;
      if (!candidate.id || !candidate.cafeName || !candidate.city || !candidate.drink || !candidate.createdAt) {
        return null;
      }

      return {
        id: candidate.id,
        reviewId: typeof candidate.reviewId === "string" ? candidate.reviewId : undefined,
        cafeId: candidate.cafeId ?? null,
        cafeName: candidate.cafeName,
        city: candidate.city,
        drink: candidate.drink,
        rating: Number(candidate.rating ?? 0),
        note: candidate.note ?? "",
        tags: Array.isArray(candidate.tags) ? candidate.tags.filter((tag): tag is string => typeof tag === "string") : [],
        createdAt: candidate.createdAt,
        source: candidate.source === "review" ? "review" : "manual",
      };
    })
    .filter((entry): entry is CoffeeJournalEntry => Boolean(entry))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return normalizedEntries;
}

function readJournalRaw() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(COFFEE_JOURNAL_STORAGE_KEY);
  } catch {
    return null;
  }
}

function readJournalSnapshot() {
  const raw = readJournalRaw();

  if (cachedJournalSnapshot !== undefined && cachedJournalRaw === raw) {
    return cachedJournalSnapshot;
  }

  if (!raw) {
    cachedJournalRaw = raw;
    cachedJournalSnapshot = [];
    return cachedJournalSnapshot;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    cachedJournalRaw = raw;
    cachedJournalSnapshot = normalizeEntries(parsed);
    return cachedJournalSnapshot;
  } catch {
    cachedJournalRaw = raw;
    cachedJournalSnapshot = [];
    return cachedJournalSnapshot;
  }
}

function dispatchJournalUpdate() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(COFFEE_JOURNAL_EVENT));
}

export function getStoredCoffeeJournal() {
  if (typeof window === "undefined") {
    return SERVER_JOURNAL_SNAPSHOT;
  }

  return readJournalSnapshot();
}

export function getStoredCoffeeJournalServerSnapshot() {
  return SERVER_JOURNAL_SNAPSHOT;
}

export function subscribeToCoffeeJournal(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = () => {
    cachedJournalSnapshot = undefined;
    cachedJournalRaw = undefined;
    onStoreChange();
  };

  window.addEventListener("storage", handler);
  window.addEventListener(COFFEE_JOURNAL_EVENT, handler);

  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(COFFEE_JOURNAL_EVENT, handler);
  };
}

export function setStoredCoffeeJournal(entries: CoffeeJournalEntry[]) {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = [...entries].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const raw = JSON.stringify(normalized);
  window.localStorage.setItem(COFFEE_JOURNAL_STORAGE_KEY, raw);
  cachedJournalRaw = raw;
  cachedJournalSnapshot = normalized;
  dispatchJournalUpdate();
}

export function addCoffeeJournalEntry(input: JournalInput) {
  const current = getStoredCoffeeJournal();
  const cafeName = input.cafe?.name ?? input.place?.name ?? "Coffee stop";
  const city = input.cafe?.city ?? input.place?.city ?? "Nearby";
  const cafeId = input.cafe?.id ?? null;
  const note = input.note.trim();
  const tags = Array.from(new Set(input.tags.map((tag) => tag.trim()).filter(Boolean))).slice(0, 5);

  const nextEntry: CoffeeJournalEntry = {
    id: globalThis.crypto?.randomUUID?.() ?? `journal-${Date.now()}`,
    cafeId,
    cafeName,
    city,
    drink: input.drink,
    rating: input.rating,
    note,
    tags,
    createdAt: new Date().toISOString(),
    source: input.source,
  };

  setStoredCoffeeJournal([nextEntry, ...current].slice(0, 80));
  return nextEntry;
}

type ReviewJournalImport = {
  reviewId: string;
  cafeId: string | null;
  cafeName: string;
  city: string;
  drink: string;
  rating: number;
  note: string;
  tags?: string[];
  createdAt: string;
};

export function syncReviewEntriesIntoCoffeeJournal(reviewEntries: ReviewJournalImport[]) {
  const current = getStoredCoffeeJournal();
  const existingReviewIds = new Set(
    current
      .map((entry) => entry.reviewId)
      .filter((value): value is string => typeof value === "string" && value.length > 0),
  );

  const nextEntries = reviewEntries
    .filter((entry) => !existingReviewIds.has(entry.reviewId))
    .map((entry) => ({
      id: `journal-review-${entry.reviewId}`,
      reviewId: entry.reviewId,
      cafeId: entry.cafeId,
      cafeName: entry.cafeName,
      city: entry.city,
      drink: entry.drink,
      rating: entry.rating,
      note: entry.note.trim(),
      tags: Array.isArray(entry.tags) ? entry.tags.filter(Boolean).slice(0, 5) : [],
      createdAt: entry.createdAt,
      source: "review" as const,
    }));

  if (nextEntries.length === 0) {
    return current;
  }

  setStoredCoffeeJournal([...nextEntries, ...current].slice(0, 80));
  return getStoredCoffeeJournal();
}

function titleize(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function getMostFrequentLabel(map: Map<string, number>) {
  return Array.from(map.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
}

function getDrinkFamilyLabel(drink: string | null, tone: "title" | "sentence" = "title") {
  if (!drink) {
    return null;
  }

  const base =
    drink === "Espresso"
      ? "espresso-based drinks"
      : drink === "Milk drink"
        ? "milk drinks"
        : drink === "Filter"
          ? "filter coffees"
          : drink === "Cold"
            ? "cold coffees"
            : drink === "Seasonal"
              ? "seasonal drinks"
              : drink.toLowerCase();

  return tone === "title" ? titleize(base) : base;
}

function getCafeDrinkFamilies(cafe: Cafe) {
  const families = new Set<string>();

  for (const drink of cafe.drinks) {
    const normalized = drink.toLowerCase();
    if (["espresso", "macchiato", "cortado", "ristretto", "americano"].includes(normalized)) {
      families.add("Espresso");
    }
    if (["flat white", "cappuccino", "latte", "mocha", "iced latte"].includes(normalized)) {
      families.add("Milk drink");
    }
    if (["filter", "pour over", "batch brew", "manual brew"].includes(normalized)) {
      families.add("Filter");
    }
    if (["cold brew", "iced coffee", "iced latte"].includes(normalized)) {
      families.add("Cold");
    }
    if (normalized.includes("seasonal") || normalized.includes("signature")) {
      families.add("Seasonal");
    }
  }

  return families;
}

function createWheelScoreMap() {
  return new Map<TasteWheelKey, number>(TASTE_WHEEL_META.map((item) => [item.key, 0]));
}

function applyDrinkWheelScores(entry: CoffeeJournalEntry, wheelScores: Map<TasteWheelKey, number>) {
  const entryMultiplier = entry.rating >= 8 ? 1.15 : entry.rating <= 5 ? 0.8 : 1;
  const add = (key: TasteWheelKey, amount: number) => {
    wheelScores.set(key, (wheelScores.get(key) ?? 0) + amount * entryMultiplier);
  };

  if (entry.drink === "Filter") {
    add("bright", 1);
    add("fruity", 0.75);
    add("floral", 0.55);
  } else if (entry.drink === "Espresso") {
    add("bold", 1);
    add("chocolatey", 0.5);
  } else if (entry.drink === "Milk drink") {
    add("chocolatey", 1);
    add("nutty", 0.75);
    add("bold", 0.25);
  } else if (entry.drink === "Seasonal") {
    add("fruity", 0.5);
    add("floral", 0.5);
    add("bold", 0.25);
  } else if (entry.drink === "Cold") {
    add("bright", 0.5);
    add("fruity", 0.5);
  }
}

function applyTagWheelScores(entry: CoffeeJournalEntry, wheelScores: Map<TasteWheelKey, number>) {
  const entryMultiplier = entry.rating >= 8 ? 1.15 : entry.rating <= 5 ? 0.8 : 1;
  const add = (key: TasteWheelKey, amount: number) => {
    wheelScores.set(key, (wheelScores.get(key) ?? 0) + amount * entryMultiplier);
  };

  for (const tag of entry.tags) {
    const normalized = tag.toLowerCase();

    if (normalized === "chocolatey") {
      add("chocolatey", 1);
    }
    if (normalized === "nutty") {
      add("nutty", 1);
    }
    if (normalized === "bright") {
      add("bright", 1);
    }
    if (normalized === "fruity") {
      add("fruity", 1);
    }
    if (normalized === "floral") {
      add("floral", 1);
    }
    if (normalized === "bold") {
      add("bold", 1);
    }
    if (normalized === "smooth") {
      add("nutty", 0.75);
      add("chocolatey", 0.5);
    }
    if (normalized === "sweet") {
      add("chocolatey", 0.55);
      add("nutty", 0.45);
    }
    if (normalized === "clean") {
      add("bright", 0.5);
      add("floral", 0.5);
    }
  }
}

function buildTasteWheel(wheelScores: Map<TasteWheelKey, number>) {
  const sortedWheel = TASTE_WHEEL_META.map((item) => ({
    ...item,
    rawValue: wheelScores.get(item.key) ?? 0,
  })).sort((left, right) => right.rawValue - left.rawValue);

  const maxWheelValue = sortedWheel[0]?.rawValue ?? 0;
  const tasteWheel: TasteWheelSegment[] = sortedWheel
    .map((item) => ({
      key: item.key,
      label: item.label,
      shortLabel: item.shortLabel,
      color: item.color,
      value: maxWheelValue > 0 ? Number((item.rawValue / maxWheelValue).toFixed(2)) : 0.16,
    }))
    .sort(
      (left, right) =>
        TASTE_WHEEL_META.findIndex((item) => item.key === left.key) -
        TASTE_WHEEL_META.findIndex((item) => item.key === right.key),
    );

  return { sortedWheel, tasteWheel };
}

export function getCoffeeJournalInsight(entries: CoffeeJournalEntry[]): CoffeeJournalInsight {
  const drinkCounts = new Map<string, number>();
  const tagCounts = new Map<string, number>();
  const cafeCounts = new Map<string, number>();
  const cities = new Set<string>();
  const ratings: number[] = [];
  const wheelScores = createWheelScoreMap();

  for (const entry of entries) {
    drinkCounts.set(entry.drink, (drinkCounts.get(entry.drink) ?? 0) + 1);
    cafeCounts.set(entry.cafeName, (cafeCounts.get(entry.cafeName) ?? 0) + 1);
    if (entry.city.trim()) {
      cities.add(entry.city.trim().toLowerCase());
    }
    if (Number.isFinite(entry.rating) && entry.rating > 0) {
      ratings.push(entry.rating);
    }

    applyDrinkWheelScores(entry, wheelScores);

    for (const tag of entry.tags) {
      const normalized = tag.toLowerCase();
      tagCounts.set(normalized, (tagCounts.get(normalized) ?? 0) + 1);
    }
    applyTagWheelScores(entry, wheelScores);
  }

  const favoriteDrink = getMostFrequentLabel(drinkCounts);
  const topCafe = getMostFrequentLabel(cafeCounts);
  const favoriteDrinkFamily = getDrinkFamilyLabel(favoriteDrink, "sentence");
  const topTags = Array.from(tagCounts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 3)
    .map(([tag]) => titleize(tag));
  const averageRating =
    ratings.length > 0 ? Number((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1)) : null;

  const strongestTag = Array.from(tagCounts.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
  const { sortedWheel, tasteWheel } = buildTasteWheel(wheelScores);

  const primaryTaste = sortedWheel[0]?.label ?? null;
  const secondaryTaste = (sortedWheel[1]?.rawValue ?? 0) > 0 ? sortedWheel[1]?.label ?? null : null;
  const primaryKey = sortedWheel[0]?.key ?? null;
  const secondaryKey = sortedWheel[1]?.key ?? null;

  const tasteMood =
    primaryKey === "bright" || primaryKey === "fruity" || primaryKey === "floral"
      ? secondaryKey === "floral"
        ? "Lively and delicate"
        : "Bright explorer"
      : primaryKey === "chocolatey" || primaryKey === "nutty"
        ? secondaryKey === "bold"
          ? "Comfort with punch"
          : "Comfort seeker"
        : primaryKey === "bold"
          ? "Espresso chaser"
          : favoriteDrink === "Filter"
            ? "Curious sipper"
            : "Taste in progress";
  const glossaryTip =
    (strongestTag ? glossaryByTag[strongestTag] : null) ??
    "Your journal gets more useful when you describe what you felt in the cup, not just whether it was good.";

  const learningPrompt = favoriteDrink
    ? `You keep returning to ${favoriteDrinkFamily}. That is a strong clue for what Near Me should prioritize for you.`
    : "A few more logs will help Near Me understand whether you lean brighter, smoother, or more espresso-forward.";

  const homeCue =
    primaryKey === "fruity" || primaryKey === "bright" || primaryKey === "floral"
      ? "At home later, you will probably enjoy cleaner brews, lighter roasts, and filter-friendly gear."
      : primaryKey === "chocolatey" || primaryKey === "nutty"
        ? "At home later, you will probably enjoy balanced beans and gear that suits milk drinks and everyday espresso."
        : primaryKey === "bold"
          ? "At home later, you will probably prefer punchier espresso setups and coffees with more body."
          : "As your journal grows, Near Me can start suggesting beans and home setups that match your taste.";

  const recentEntries = entries.slice(0, Math.min(entries.length, 5));
  const earlierEntries = entries.slice(Math.min(entries.length, 5));
  const recentDrinkCounts = new Map<string, number>();
  const recentWheelScores = createWheelScoreMap();
  const earlierWheelScores = createWheelScoreMap();
  for (const entry of recentEntries) {
    recentDrinkCounts.set(entry.drink, (recentDrinkCounts.get(entry.drink) ?? 0) + 1);
    applyDrinkWheelScores(entry, recentWheelScores);
    applyTagWheelScores(entry, recentWheelScores);
  }
  for (const entry of earlierEntries) {
    applyDrinkWheelScores(entry, earlierWheelScores);
    applyTagWheelScores(entry, earlierWheelScores);
  }

  const recentFavoriteDrink = getMostFrequentLabel(recentDrinkCounts);
  const recentFavoriteDrinkFamily = getDrinkFamilyLabel(recentFavoriteDrink, "sentence");
  const { sortedWheel: sortedRecentWheel, tasteWheel: recentTasteWheel } = buildTasteWheel(recentWheelScores);
  const { sortedWheel: sortedEarlierWheel } = buildTasteWheel(earlierWheelScores);
  const recentPrimaryKey = sortedRecentWheel[0]?.key ?? null;
  const earlierPrimaryKey = sortedEarlierWheel[0]?.rawValue ? sortedEarlierWheel[0]?.key ?? null : null;

  const recentPrimaryLabel = TASTE_WHEEL_META.find((item) => item.key === recentPrimaryKey)?.label ?? null;
  const earlierPrimaryLabel = TASTE_WHEEL_META.find((item) => item.key === earlierPrimaryKey)?.label ?? null;
  const evolutionSummary =
    recentPrimaryLabel && earlierPrimaryLabel && recentPrimaryLabel !== earlierPrimaryLabel
      ? `Your recent cups are leaning more ${recentPrimaryLabel.toLowerCase()} than before.`
      : recentPrimaryLabel
        ? `Your recent cups are reinforcing a ${recentPrimaryLabel.toLowerCase()} lean.`
        : "Your taste evolution will sharpen as you add a few more logs.";

  const latestHighlight = entries.find((entry) => entry.rating >= 8)?.cafeName ?? topCafe;
  const milestoneTargets = [5, 10, 20, 30];
  const nextMilestone = milestoneTargets.find((target) => entries.length < target) ?? null;
  const milestoneLabel =
    entries.length >= 30
      ? "Taste archive building"
      : nextMilestone
        ? `${entries.length}/${nextMilestone} cups logged`
        : null;
  const milestoneProgress =
    entries.length >= 30
      ? "You have enough history for real pattern spotting."
      : nextMilestone
        ? `${nextMilestone - entries.length} more logs until your next journal milestone.`
        : null;

  const patternInsights = [
    favoriteDrinkFamily ? `${titleize(favoriteDrinkFamily)} are your strongest repeat style right now.` : null,
    topCafe ? `${topCafe} is showing up most often in your journal.` : null,
    latestHighlight ? `${latestHighlight} is one of your standout recent cups.` : null,
    recentFavoriteDrink && recentFavoriteDrink !== favoriteDrink
      ? `Lately you have been reaching for ${recentFavoriteDrinkFamily} more often.`
      : null,
  ].filter((value): value is string => Boolean(value)).slice(0, 3);

  const shareMoments: CoffeeJournalInsight["shareMoments"] = [
    {
      id: "taste-read",
      eyebrow: "Taste read",
      title:
        primaryTaste && secondaryTaste
          ? `${tasteMood} with a ${secondaryTaste.toLowerCase()} lean`
          : primaryTaste
            ? `${tasteMood}`
            : "My coffee taste is still taking shape",
      body:
        favoriteDrinkFamily
          ? `Near Me keeps seeing me come back to ${favoriteDrinkFamily}.`
          : "Near Me is starting to learn the kind of coffee I naturally enjoy.",
      shareText:
        primaryTaste && secondaryTaste
          ? `My Near Me coffee journal says I’m ${tasteMood.toLowerCase()} with a ${secondaryTaste.toLowerCase()} lean.`
          : `My Near Me coffee journal is starting to map the kind of coffee I love.`,
    },
    {
      id: "taste-shift",
      eyebrow: "Taste evolution",
      title: evolutionSummary,
      body:
        recentFavoriteDrinkFamily
          ? `Lately I’ve been reaching for ${recentFavoriteDrinkFamily} more often.`
          : "My recent cups are starting to shift the shape of my taste.",
      shareText: `Near Me noticed a shift in my coffee taste: ${evolutionSummary.charAt(0).toLowerCase()}${evolutionSummary.slice(1)}`,
    },
    {
      id: "standout-cup",
      eyebrow: "Standout cup",
      title: latestHighlight ? latestHighlight : topCafe ? topCafe : "Still logging my best cups",
      body:
        latestHighlight
          ? `One of my recent standout coffee stops in Near Me.`
          : topCafe
            ? `This place keeps showing up most in my journal.`
            : "A few more logs and Near Me will start surfacing my standout cups.",
      shareText: latestHighlight
        ? `One of my standout recent cups in Near Me was at ${latestHighlight}.`
        : topCafe
          ? `${topCafe} keeps showing up in my Near Me coffee journal.`
          : `I’m building out my coffee journal in Near Me.`,
    },
  ];

  return {
    entryCount: entries.length,
    favoriteDrink,
    topTags,
    cityCount: cities.size,
    averageRating,
    tasteMood,
    tasteWheel,
    recentTasteWheel,
    primaryTaste,
    secondaryTaste,
    topCafe,
    recentFavoriteDrink,
    milestoneLabel,
    milestoneProgress,
    evolutionSummary,
    latestHighlight,
    patternInsights,
    learningPrompt,
    glossaryTip,
    homeCue,
    shareMoments,
  };
}

export function getJournalCafeMatch(cafe: Cafe, entries: CoffeeJournalEntry[]): JournalCafeMatch | null {
  if (entries.length === 0) {
    return null;
  }

  const insight = getCoffeeJournalInsight(entries);
  const drinkFamilies = getCafeDrinkFamilies(cafe);
  let score = 0;
  const reasons: string[] = [];

  if (insight.favoriteDrink && drinkFamilies.has(insight.favoriteDrink)) {
    score += 2.2;
    const drinkLabel = getDrinkFamilyLabel(insight.favoriteDrink, "sentence");
    if (drinkLabel) {
      reasons.push(`Fits your usual ${drinkLabel}`);
    }
  }

  const topWheel = insight.tasteWheel
    .filter((segment) => segment.value >= 0.45)
    .sort((left, right) => right.value - left.value)
    .slice(0, 2);

  for (const segment of topWheel) {
    if (cafe.tags.some((tag) => tag.toLowerCase() === segment.label.toLowerCase())) {
      score += 1.1;
      reasons.push(`Matches your ${segment.label.toLowerCase()} lean`);
    }
  }

  for (const tag of insight.topTags.slice(0, 2)) {
    if (cafe.tags.some((cafeTag) => cafeTag.toLowerCase() === tag.toLowerCase())) {
      score += 0.8;
      reasons.push(`You often like ${tag.toLowerCase()} cups`);
    }
  }

  if (insight.recentFavoriteDrink && drinkFamilies.has(insight.recentFavoriteDrink) && insight.recentFavoriteDrink !== insight.favoriteDrink) {
    score += 0.7;
    const recentLabel = getDrinkFamilyLabel(insight.recentFavoriteDrink, "sentence");
    if (recentLabel) {
      reasons.push(`Aligns with your recent ${recentLabel}`);
    }
  }

  const reviewStrength = Math.min(cafe.reviewSummary.reviewCount, 18) * 0.04;
  score += reviewStrength;

  const roundedScore = Number(score.toFixed(2));
  const label =
    roundedScore >= 3.8
      ? "Great fit for your journal"
      : roundedScore >= 2.4
        ? "Good fit for your journal"
        : roundedScore >= 1.2
          ? "Some overlap with your journal"
          : "Early match for your journal";

  const reason =
    reasons[0] ??
    (insight.primaryTaste
      ? `Leans ${insight.primaryTaste.toLowerCase()}, which suits your recent taste`
      : "Near Me is still learning your taste");
  const support =
    reasons[1] ??
    (insight.recentFavoriteDrink && drinkFamilies.has(insight.recentFavoriteDrink)
      ? `Also lines up with the ${getDrinkFamilyLabel(insight.recentFavoriteDrink, "sentence")} you have been reaching for lately`
      : insight.secondaryTaste
        ? `Also fits the ${insight.secondaryTaste.toLowerCase()} side of your journal`
        : null);

  return {
    score: roundedScore,
    label,
    reason,
    support,
  };
}

export function getCafeJournalMemory(
  entries: CoffeeJournalEntry[],
  input: { cafeId?: string | null; cafeName: string },
): CafeJournalMemory | null {
  const matchingEntries = entries.filter((entry) =>
    input.cafeId ? entry.cafeId === input.cafeId : entry.cafeName.toLowerCase() === input.cafeName.toLowerCase(),
  );

  if (matchingEntries.length === 0) {
    return null;
  }

  const ratings = matchingEntries
    .map((entry) => Number(entry.rating))
    .filter((rating) => Number.isFinite(rating) && rating > 0);
  const averageRating =
    ratings.length > 0
      ? Number((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1))
      : null;
  const drinkCounts = new Map<string, number>();
  const tagCounts = new Map<string, number>();

  for (const entry of matchingEntries) {
    drinkCounts.set(entry.drink, (drinkCounts.get(entry.drink) ?? 0) + 1);
    for (const tag of entry.tags) {
      const normalized = tag.toLowerCase();
      tagCounts.set(normalized, (tagCounts.get(normalized) ?? 0) + 1);
    }
  }

  const lastDrink = matchingEntries[0]?.drink ?? null;
  const latestNote = matchingEntries[0]?.note?.trim() || null;
  const latestVisitedAt = matchingEntries[0]?.createdAt ?? null;
  const topTags = Array.from(tagCounts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 3)
    .map(([tag]) => titleize(tag));

  return {
    visitCount: matchingEntries.length,
    averageRating,
    lastDrink,
    topTags,
    latestNote,
    latestVisitedAt,
  };
}
