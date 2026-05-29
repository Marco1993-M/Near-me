import type { Cafe, FallbackPlace } from "@/types/cafe";

export type CoffeeJournalEntry = {
  id: string;
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
  learningPrompt: string;
  glossaryTip: string;
  homeCue: string;
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

function normalizeEntries(input: unknown): CoffeeJournalEntry[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const candidate = entry as Partial<CoffeeJournalEntry>;
      if (!candidate.id || !candidate.cafeName || !candidate.city || !candidate.drink || !candidate.createdAt) {
        return null;
      }

      return {
        id: candidate.id,
        cafeId: candidate.cafeId ?? null,
        cafeName: candidate.cafeName,
        city: candidate.city,
        drink: candidate.drink,
        rating: Number(candidate.rating ?? 0),
        note: candidate.note ?? "",
        tags: Array.isArray(candidate.tags) ? candidate.tags.filter((tag): tag is string => typeof tag === "string") : [],
        createdAt: candidate.createdAt,
        source: candidate.source === "review" ? "review" : "manual",
      } satisfies CoffeeJournalEntry;
    })
    .filter((entry): entry is CoffeeJournalEntry => Boolean(entry))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
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

  for (const entry of entries) {
    drinkCounts.set(entry.drink, (drinkCounts.get(entry.drink) ?? 0) + 1);
    for (const tag of entry.tags) {
      const normalized = tag.toLowerCase();
      tagCounts.set(normalized, (tagCounts.get(normalized) ?? 0) + 1);
    }
  }

  const favoriteDrink =
    Array.from(drinkCounts.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
  const topTags = Array.from(tagCounts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 3)
    .map(([tag]) => titleize(tag));

  const strongestTag = Array.from(tagCounts.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
  const glossaryTip =
    (strongestTag ? glossaryByTag[strongestTag] : null) ??
    "Your journal gets more useful when you describe what you felt in the cup, not just whether it was good.";

  const learningPrompt = favoriteDrink
    ? `You keep returning to ${favoriteDrink.toLowerCase()}-style drinks. That is a strong clue for what Near Me should prioritize for you.`
    : "A few more logs will help Near Me understand whether you lean brighter, smoother, or more espresso-forward.";

  const homeCue =
    strongestTag === "fruity" || strongestTag === "bright" || strongestTag === "floral"
      ? "At home later, you will probably enjoy cleaner brews, lighter roasts, and filter-friendly gear."
      : strongestTag === "chocolatey" || strongestTag === "smooth" || strongestTag === "sweet"
        ? "At home later, you will probably enjoy balanced beans and gear that suits milk drinks and everyday espresso."
        : strongestTag === "bold"
          ? "At home later, you will probably prefer punchier espresso setups and coffees with more body."
          : "As your journal grows, Near Me can start suggesting beans and home setups that match your taste.";

  return {
    entryCount: entries.length,
    favoriteDrink,
    topTags,
    learningPrompt,
    glossaryTip,
    homeCue,
  };
}
