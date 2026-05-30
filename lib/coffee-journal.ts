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
  primaryTaste: string | null;
  secondaryTaste: string | null;
  learningPrompt: string;
  glossaryTip: string;
  homeCue: string;
};

export type CafeJournalMemory = {
  visitCount: number;
  averageRating: number | null;
  lastDrink: string | null;
  topTags: string[];
  latestNote: string | null;
  latestVisitedAt: string | null;
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

export function getCoffeeJournalInsight(entries: CoffeeJournalEntry[]): CoffeeJournalInsight {
  const drinkCounts = new Map<string, number>();
  const tagCounts = new Map<string, number>();
  const cities = new Set<string>();
  const ratings: number[] = [];
  const wheelScores = new Map<TasteWheelKey, number>(TASTE_WHEEL_META.map((item) => [item.key, 0]));

  const addWheelScore = (key: TasteWheelKey, amount: number) => {
    wheelScores.set(key, (wheelScores.get(key) ?? 0) + amount);
  };

  for (const entry of entries) {
    drinkCounts.set(entry.drink, (drinkCounts.get(entry.drink) ?? 0) + 1);
    if (entry.city.trim()) {
      cities.add(entry.city.trim().toLowerCase());
    }
    if (Number.isFinite(entry.rating) && entry.rating > 0) {
      ratings.push(entry.rating);
    }

    const entryMultiplier = entry.rating >= 8 ? 1.15 : entry.rating <= 5 ? 0.8 : 1;

    if (entry.drink === "Filter") {
      addWheelScore("bright", 1 * entryMultiplier);
      addWheelScore("fruity", 0.75 * entryMultiplier);
      addWheelScore("floral", 0.55 * entryMultiplier);
    } else if (entry.drink === "Espresso") {
      addWheelScore("bold", 1 * entryMultiplier);
      addWheelScore("chocolatey", 0.5 * entryMultiplier);
    } else if (entry.drink === "Milk drink") {
      addWheelScore("chocolatey", 1 * entryMultiplier);
      addWheelScore("nutty", 0.75 * entryMultiplier);
      addWheelScore("bold", 0.25 * entryMultiplier);
    } else if (entry.drink === "Seasonal") {
      addWheelScore("fruity", 0.5 * entryMultiplier);
      addWheelScore("floral", 0.5 * entryMultiplier);
      addWheelScore("bold", 0.25 * entryMultiplier);
    } else if (entry.drink === "Cold") {
      addWheelScore("bright", 0.5 * entryMultiplier);
      addWheelScore("fruity", 0.5 * entryMultiplier);
    }

    for (const tag of entry.tags) {
      const normalized = tag.toLowerCase();
      tagCounts.set(normalized, (tagCounts.get(normalized) ?? 0) + 1);

      if (normalized === "chocolatey") {
        addWheelScore("chocolatey", 1 * entryMultiplier);
      }
      if (normalized === "nutty") {
        addWheelScore("nutty", 1 * entryMultiplier);
      }
      if (normalized === "bright") {
        addWheelScore("bright", 1 * entryMultiplier);
      }
      if (normalized === "fruity") {
        addWheelScore("fruity", 1 * entryMultiplier);
      }
      if (normalized === "floral") {
        addWheelScore("floral", 1 * entryMultiplier);
      }
      if (normalized === "bold") {
        addWheelScore("bold", 1 * entryMultiplier);
      }
      if (normalized === "smooth") {
        addWheelScore("nutty", 0.75 * entryMultiplier);
        addWheelScore("chocolatey", 0.5 * entryMultiplier);
      }
      if (normalized === "sweet") {
        addWheelScore("chocolatey", 0.55 * entryMultiplier);
        addWheelScore("nutty", 0.45 * entryMultiplier);
      }
      if (normalized === "clean") {
        addWheelScore("bright", 0.5 * entryMultiplier);
        addWheelScore("floral", 0.5 * entryMultiplier);
      }
    }
  }

  const favoriteDrink =
    Array.from(drinkCounts.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
  const topTags = Array.from(tagCounts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 3)
    .map(([tag]) => titleize(tag));
  const averageRating =
    ratings.length > 0 ? Number((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1)) : null;

  const strongestTag = Array.from(tagCounts.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
  const sortedWheel = TASTE_WHEEL_META.map((item) => ({
    ...item,
    rawValue: wheelScores.get(item.key) ?? 0,
  })).sort((left, right) => right.rawValue - left.rawValue);
  const maxWheelValue = sortedWheel[0]?.rawValue ?? 0;
  const tasteWheel = sortedWheel
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
    ? `You keep returning to ${favoriteDrink.toLowerCase()}-style drinks. That is a strong clue for what Near Me should prioritize for you.`
    : "A few more logs will help Near Me understand whether you lean brighter, smoother, or more espresso-forward.";

  const homeCue =
    primaryKey === "fruity" || primaryKey === "bright" || primaryKey === "floral"
      ? "At home later, you will probably enjoy cleaner brews, lighter roasts, and filter-friendly gear."
      : primaryKey === "chocolatey" || primaryKey === "nutty"
        ? "At home later, you will probably enjoy balanced beans and gear that suits milk drinks and everyday espresso."
        : primaryKey === "bold"
          ? "At home later, you will probably prefer punchier espresso setups and coffees with more body."
          : "As your journal grows, Near Me can start suggesting beans and home setups that match your taste.";

  return {
    entryCount: entries.length,
    favoriteDrink,
    topTags,
    cityCount: cities.size,
    averageRating,
    tasteMood,
    tasteWheel,
    primaryTaste,
    secondaryTaste,
    learningPrompt,
    glossaryTip,
    homeCue,
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
