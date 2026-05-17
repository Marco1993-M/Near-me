import type { Cafe } from "@/types/cafe";

export type CoffeeProfilerDimension =
  | "sweet"
  | "acidity"
  | "body"
  | "nutty"
  | "fruity"
  | "floral"
  | "spicy"
  | "intensity";

export type CoffeeProfilerScores = Record<CoffeeProfilerDimension, number>;

export type CoffeeProfilerOption = {
  text: string;
  scores: Partial<CoffeeProfilerScores>;
};

export type CoffeeProfilerQuestion = {
  question: string;
  type: "single" | "multi";
  maxChoices?: number;
  options: CoffeeProfilerOption[];
};

export type CoffeeProfile = {
  slug: string;
  name: string;
  shortName: string;
  description: string;
  traits: CoffeeProfilerDimension[];
  secondaryTraits?: CoffeeProfilerDimension[];
  recommendedDrinks: string[];
  lookFor: string[];
  avoid: string[];
};

export type CoffeeProfileConfidence = "Emerging" | "Settling" | "Clear" | "Very clear";

export type CoffeeProfileState = {
  profileSlug: string;
  scores: CoffeeProfilerScores;
  reviewCount: number;
  source: "quiz" | "quiz+reviews";
  updatedAt: string;
};

export type CoffeeProfileReviewInput = {
  rating: number;
  drink: string | null;
  tags: string[];
};

export type CafeProfileMatch = {
  rawScore: number;
  percentage: number;
  label: string;
  reasons: string[];
};

type DimensionContribution = {
  keyword: string;
  scores: Partial<CoffeeProfilerScores>;
  reason?: string;
};

const PROFILER_DIMENSIONS: CoffeeProfilerDimension[] = [
  "sweet",
  "acidity",
  "body",
  "nutty",
  "fruity",
  "floral",
  "spicy",
  "intensity",
];

const PROFILE_STORAGE_VERSION = 2;
const SERVER_PROFILE_STATE_SNAPSHOT: CoffeeProfileState | null = null;

export const COFFEE_PROFILER_STORAGE_KEY = "near-me-coffee-profile";
export const COFFEE_PROFILER_STATE_STORAGE_KEY = "near-me-coffee-profile-state";
export const COFFEE_PROFILER_EVENT = "near-me-coffee-profile-updated";

let cachedProfileStateSnapshot: CoffeeProfileState | null | undefined;
let cachedProfileStateRaw: string | null | undefined;

export const defaultProfilerScores = (): CoffeeProfilerScores => ({
  sweet: 0,
  acidity: 0,
  body: 0,
  nutty: 0,
  fruity: 0,
  floral: 0,
  spicy: 0,
  intensity: 0,
});

const dimensionLabels: Record<CoffeeProfilerDimension, string> = {
  sweet: "sweetness",
  acidity: "brightness",
  body: "body",
  nutty: "chocolatey depth",
  fruity: "fruit",
  floral: "floral clarity",
  spicy: "spice",
  intensity: "espresso punch",
};

const drinkScoreMap: Record<string, Partial<CoffeeProfilerScores>> = {
  espresso: { intensity: 2, body: 1 },
  macchiato: { intensity: 2, sweet: 1 },
  cortado: { body: 2, intensity: 1, nutty: 1 },
  "flat white": { sweet: 2, body: 2 },
  cappuccino: { sweet: 2, body: 1 },
  latte: { sweet: 2, body: 1 },
  "iced latte": { sweet: 1, body: 1 },
  filter: { acidity: 2, fruity: 1, floral: 1 },
  "pour over": { acidity: 2, fruity: 2, floral: 1 },
  seasonal: { spicy: 1, fruity: 1, intensity: 1 },
  "seasonal drink": { spicy: 1, fruity: 1, intensity: 1 },
  "milk drink": { sweet: 2, body: 2 },
  cold: { sweet: 1, body: 1 },
};

const tagScoreMap: Record<string, Partial<CoffeeProfilerScores>> = {
  chocolatey: { nutty: 2, sweet: 1 },
  fruity: { fruity: 2, acidity: 1 },
  floral: { floral: 2, acidity: 1 },
  bold: { intensity: 2, body: 1 },
  smooth: { sweet: 1, body: 1 },
  balanced: { sweet: 1, acidity: 1, body: 1 },
};

const cafeSignalContributions: DimensionContribution[] = [
  { keyword: "filter", scores: { acidity: 2, fruity: 1, floral: 1 }, reason: "strong filter options" },
  { keyword: "pour over", scores: { acidity: 2, fruity: 2, floral: 1 }, reason: "pour-over friendly menu" },
  { keyword: "flat white", scores: { sweet: 2, body: 2 }, reason: "well-loved milk drinks" },
  { keyword: "cappuccino", scores: { sweet: 2, body: 1 }, reason: "comforting milk-based coffee" },
  { keyword: "latte", scores: { sweet: 2, body: 1 }, reason: "easy-drinking milk drinks" },
  { keyword: "espresso", scores: { intensity: 2, body: 1 }, reason: "espresso-led identity" },
  { keyword: "cortado", scores: { intensity: 1, body: 2, nutty: 1 }, reason: "cortado and short milk drinks" },
  { keyword: "signature", scores: { spicy: 1, intensity: 1, fruity: 1 }, reason: "a menu with personality" },
  { keyword: "seasonal", scores: { spicy: 1, fruity: 1, intensity: 1 }, reason: "rotating seasonal specials" },
  { keyword: "roaster", scores: { fruity: 1, intensity: 1 }, reason: "roaster-led coffee focus" },
  { keyword: "single-origin", scores: { fruity: 2, floral: 1, acidity: 1 }, reason: "single-origin coffees" },
  { keyword: "top rated", scores: { sweet: 1, acidity: 1, body: 1 }, reason: "consistently strong reviews" },
  { keyword: "popular", scores: { sweet: 1, body: 1 }, reason: "a proven local favorite" },
  { keyword: "specialty coffee", scores: { acidity: 1, fruity: 1, intensity: 1 }, reason: "clear specialty coffee signals" },
  { keyword: "pastr", scores: { sweet: 1 }, reason: "pairs well with pastry-style coffee stops" },
  { keyword: "quiet", scores: { body: 1 }, reason: "a calmer coffee experience" },
];

export const coffeeProfilerQuestions: CoffeeProfilerQuestion[] = [
  {
    question: "Your ideal coffee moment feels like...",
    type: "single",
    options: [
      { text: "A bright, energizing start", scores: { acidity: 2, fruity: 1, floral: 1 } },
      { text: "A calm, comforting ritual", scores: { sweet: 2, body: 1 } },
      { text: "A deeper, more focused coffee break", scores: { body: 2, intensity: 1, spicy: 1 } },
    ],
  },
  {
    question: "You usually prefer coffee that tastes...",
    type: "single",
    options: [
      { text: "Juicy and lively", scores: { acidity: 2, fruity: 2 } },
      { text: "Balanced and smooth", scores: { sweet: 2, body: 1, acidity: 1 } },
      { text: "Bold and rich", scores: { body: 2, intensity: 2, nutty: 1 } },
    ],
  },
  {
    question: "Which flavor notes sound best to you? Pick two.",
    type: "multi",
    maxChoices: 2,
    options: [
      { text: "Berry / tropical fruit", scores: { fruity: 2, acidity: 1 } },
      { text: "Floral / tea-like", scores: { floral: 2, acidity: 1 } },
      { text: "Chocolate / nuts", scores: { nutty: 2, body: 1 } },
      { text: "Caramel / honey", scores: { sweet: 2, body: 1 } },
      { text: "Spice / dark sugar", scores: { spicy: 2, intensity: 1 } },
    ],
  },
  {
    question: "What do you order most often?",
    type: "single",
    options: [
      { text: "Filter / pour over", scores: { acidity: 2, fruity: 1, floral: 1 } },
      { text: "Flat white / cappuccino / latte", scores: { sweet: 2, body: 2 } },
      { text: "Espresso / cortado", scores: { intensity: 2, body: 1, nutty: 1 } },
      { text: "Seasonal drink / signature special", scores: { spicy: 1, fruity: 1, intensity: 1 } },
    ],
  },
  {
    question: "What kind of cafe usually excites you most?",
    type: "single",
    options: [
      { text: "One with unusual coffees and rotating menus", scores: { fruity: 1, floral: 1, spicy: 1 } },
      { text: "One with a warm, reliable everyday cup", scores: { sweet: 2, body: 1 } },
      { text: "One with a strong espresso identity", scores: { intensity: 2, body: 1 } },
    ],
  },
];

export const coffeeProfiles: CoffeeProfile[] = [
  {
    slug: "bright-explorer",
    name: "Bright Explorer",
    shortName: "Bright",
    description: "You gravitate toward lively coffees with fruit, clarity, and energy.",
    traits: ["fruity", "acidity", "floral"],
    secondaryTraits: ["sweet"],
    recommendedDrinks: ["Filter", "Pour over", "Light espresso"],
    lookFor: ["Filter-first cafes", "Single-origin menus", "Clean, juicy coffees"],
    avoid: ["Dark, generic roast profiles"],
  },
  {
    slug: "sweet-comfort",
    name: "Sweet Comfort",
    shortName: "Comfort",
    description: "You like rounded, easy-drinking coffees that feel smooth, sweet, and welcoming.",
    traits: ["sweet", "body"],
    secondaryTraits: ["nutty"],
    recommendedDrinks: ["Flat white", "Cappuccino", "Latte"],
    lookFor: ["Balanced espresso", "Milk drink specialists", "Welcoming everyday cafes"],
    avoid: ["Overly sharp, acidic cups"],
  },
  {
    slug: "rich-classic",
    name: "Rich Classic",
    shortName: "Classic",
    description: "You enjoy chocolatey, grounded coffees with satisfying body and depth.",
    traits: ["nutty", "body", "sweet"],
    secondaryTraits: ["intensity"],
    recommendedDrinks: ["Cortado", "Flat white", "Espresso"],
    lookFor: ["Chocolatey espresso", "Classic specialty bars", "Comforting roast profiles"],
    avoid: ["Thin or highly floral brews"],
  },
  {
    slug: "bold-espresso",
    name: "Bold Espresso",
    shortName: "Bold",
    description: "You appreciate intensity, structure, and a stronger espresso presence in the cup.",
    traits: ["intensity", "body", "spicy"],
    secondaryTraits: ["nutty"],
    recommendedDrinks: ["Espresso", "Cortado", "Signature house drinks"],
    lookFor: ["Confident espresso bars", "Serious barista identity", "Punchier house blends"],
    avoid: ["Flat, watered-down coffee"],
  },
  {
    slug: "balanced-curious",
    name: "Balanced Curious",
    shortName: "Balanced",
    description: "You want personality in the cup, but still with harmony and approachability.",
    traits: ["sweet", "acidity", "body"],
    secondaryTraits: ["fruity"],
    recommendedDrinks: ["Flat white", "Filter", "Seasonal espresso"],
    lookFor: ["Thoughtful all-rounders", "Well-built menus", "Easy specialty entry points"],
    avoid: ["Extremes without balance"],
  },
];

function sumProfilerScores(scores: CoffeeProfilerScores) {
  return PROFILER_DIMENSIONS.reduce((total, dimension) => total + scores[dimension], 0);
}

function normalizeStoredScores(input: Partial<Record<CoffeeProfilerDimension, number>> | null | undefined): CoffeeProfilerScores {
  const next = defaultProfilerScores();

  for (const dimension of PROFILER_DIMENSIONS) {
    const value = input?.[dimension];
    next[dimension] = Number.isFinite(value) ? Number(value) : 0;
  }

  return next;
}

function normalizeToken(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, " ");
}

function getReviewSignalWeight(rating: number) {
  if (rating >= 8) {
    return 1;
  }

  if (rating >= 6) {
    return 0.5;
  }

  return -0.35;
}

function scaleScores(
  scores: Partial<CoffeeProfilerScores>,
  weight: number,
): Partial<CoffeeProfilerScores> {
  const next: Partial<CoffeeProfilerScores> = {};

  for (const [dimension, value] of Object.entries(scores)) {
    next[dimension as CoffeeProfilerDimension] = Number(value ?? 0) * weight;
  }

  return next;
}

function addPartialScores(
  base: CoffeeProfilerScores,
  addition: Partial<CoffeeProfilerScores>,
): CoffeeProfilerScores {
  const next = { ...base };

  for (const [dimension, value] of Object.entries(addition)) {
    next[dimension as CoffeeProfilerDimension] += Number(value ?? 0);
  }

  return next;
}

function getDrinkScores(drink: string | null | undefined) {
  if (!drink) {
    return null;
  }

  const normalized = normalizeToken(drink);
  const direct = drinkScoreMap[normalized];
  if (direct) {
    return direct;
  }

  return Object.entries(drinkScoreMap).find(([key]) => normalized.includes(key))?.[1] ?? null;
}

function getTagScores(tag: string) {
  const normalized = normalizeToken(tag);
  const direct = tagScoreMap[normalized];
  if (direct) {
    return direct;
  }

  return Object.entries(tagScoreMap).find(([key]) => normalized.includes(key))?.[1] ?? null;
}

function getProfileBySlugInternal(slug: string | null | undefined) {
  return coffeeProfiles.find((profile) => profile.slug === slug) ?? coffeeProfiles[0];
}

function resolveProfileResult(scores: CoffeeProfilerScores) {
  let winner = coffeeProfiles[0];
  let highestScore = Number.NEGATIVE_INFINITY;

  for (const profile of coffeeProfiles) {
    const primaryScore = profile.traits.reduce((total, trait) => total + (scores[trait] ?? 0), 0);
    const secondaryScore = (profile.secondaryTraits ?? []).reduce(
      (total, trait) => total + (scores[trait] ?? 0) * 0.6,
      0,
    );
    const score = primaryScore + secondaryScore;

    if (score > highestScore) {
      highestScore = score;
      winner = profile;
    }
  }

  return { profile: winner, score: highestScore };
}

function getLegacyStoredProfileSlug() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(COFFEE_PROFILER_STORAGE_KEY);
}

function migrateLegacySlugToState(slug: string) {
  const profile = getProfileBySlugInternal(slug);
  const migratedScores = defaultProfilerScores();

  for (const dimension of profile.traits) {
    migratedScores[dimension] += 3;
  }

  for (const dimension of profile.secondaryTraits ?? []) {
    migratedScores[dimension] += 1.5;
  }

  return createCoffeeProfileState(migratedScores, {
    reviewCount: 0,
    source: "quiz",
  });
}

export function subscribeToCoffeeProfile(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (
      !event.key ||
      event.key === COFFEE_PROFILER_STORAGE_KEY ||
      event.key === COFFEE_PROFILER_STATE_STORAGE_KEY
    ) {
      listener();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(COFFEE_PROFILER_EVENT, listener);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(COFFEE_PROFILER_EVENT, listener);
  };
}

export function getStoredCoffeeProfileState(): CoffeeProfileState | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(COFFEE_PROFILER_STATE_STORAGE_KEY);
  if (cachedProfileStateSnapshot !== undefined && cachedProfileStateRaw === raw) {
    return cachedProfileStateSnapshot;
  }

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as {
        version?: number;
        profileSlug?: string;
        scores?: Partial<Record<CoffeeProfilerDimension, number>>;
        reviewCount?: number;
        source?: "quiz" | "quiz+reviews";
        updatedAt?: string;
      };

      if (parsed.profileSlug) {
        const snapshot: CoffeeProfileState = {
          profileSlug: parsed.profileSlug,
          scores: normalizeStoredScores(parsed.scores),
          reviewCount: Number.isFinite(parsed.reviewCount) ? Number(parsed.reviewCount) : 0,
          source: parsed.source === "quiz+reviews" ? "quiz+reviews" : "quiz",
          updatedAt: parsed.updatedAt ?? new Date().toISOString(),
        };
        cachedProfileStateRaw = raw;
        cachedProfileStateSnapshot = snapshot;
        return snapshot;
      }
    } catch {
      window.localStorage.removeItem(COFFEE_PROFILER_STATE_STORAGE_KEY);
    }
  }

  const legacySlug = getLegacyStoredProfileSlug();
  if (legacySlug) {
    const migrated = migrateLegacySlugToState(legacySlug);
    setStoredCoffeeProfileState(migrated);
    return migrated;
  }

  cachedProfileStateRaw = raw;
  cachedProfileStateSnapshot = null;
  return null;
}

export function getStoredCoffeeProfileStateServerSnapshot() {
  return SERVER_PROFILE_STATE_SNAPSHOT;
}

export function getStoredCoffeeProfileSlug() {
  return getStoredCoffeeProfileState()?.profileSlug ?? null;
}

export function getStoredCoffeeProfileSlugServerSnapshot() {
  return null;
}

export function setStoredCoffeeProfileState(state: CoffeeProfileState) {
  if (typeof window === "undefined") {
    return;
  }

  cachedProfileStateSnapshot = state;
  window.localStorage.setItem(
    COFFEE_PROFILER_STATE_STORAGE_KEY,
    JSON.stringify({
      version: PROFILE_STORAGE_VERSION,
      ...state,
    }),
  );
  cachedProfileStateRaw = window.localStorage.getItem(COFFEE_PROFILER_STATE_STORAGE_KEY);
  window.localStorage.setItem(COFFEE_PROFILER_STORAGE_KEY, state.profileSlug);
  window.dispatchEvent(new CustomEvent(COFFEE_PROFILER_EVENT, { detail: state }));
}

export function clearStoredCoffeeProfileState() {
  if (typeof window === "undefined") {
    return;
  }

  cachedProfileStateSnapshot = null;
  cachedProfileStateRaw = null;
  window.localStorage.removeItem(COFFEE_PROFILER_STATE_STORAGE_KEY);
  window.localStorage.removeItem(COFFEE_PROFILER_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(COFFEE_PROFILER_EVENT, { detail: null }));
}

export function applyProfilerOptionScores(
  scores: CoffeeProfilerScores,
  option: CoffeeProfilerOption,
): CoffeeProfilerScores {
  return addPartialScores(scores, option.scores);
}

export function resolveCoffeeProfile(scores: CoffeeProfilerScores): CoffeeProfile {
  return resolveProfileResult(scores).profile;
}

export function createCoffeeProfileState(
  scores: CoffeeProfilerScores,
  options?: {
    reviewCount?: number;
    source?: "quiz" | "quiz+reviews";
  },
): CoffeeProfileState {
  const normalizedScores = normalizeStoredScores(scores);
  const resolved = resolveProfileResult(normalizedScores);

  return {
    profileSlug: resolved.profile.slug,
    scores: normalizedScores,
    reviewCount: options?.reviewCount ?? 0,
    source: options?.source ?? "quiz",
    updatedAt: new Date().toISOString(),
  };
}

export function getCoffeeProfileBySlug(slug: string | null | undefined) {
  if (!slug) {
    return null;
  }

  return coffeeProfiles.find((profile) => profile.slug === slug) ?? null;
}

export function getCoffeeProfileConfidence(state: CoffeeProfileState | null): CoffeeProfileConfidence {
  if (!state) {
    return "Emerging";
  }

  if (state.reviewCount >= 12) {
    return "Very clear";
  }

  if (state.reviewCount >= 6) {
    return "Clear";
  }

  if (state.reviewCount >= 2) {
    return "Settling";
  }

  return "Emerging";
}

export function getCoffeeProfileTopTraits(
  scores: CoffeeProfilerScores,
  count = 3,
) {
  return [...PROFILER_DIMENSIONS]
    .sort((left, right) => scores[right] - scores[left])
    .filter((dimension) => scores[dimension] > 0)
    .slice(0, count);
}

export function getCoffeeProfileTraitLabels(
  scores: CoffeeProfilerScores,
  count = 3,
) {
  return getCoffeeProfileTopTraits(scores, count).map((dimension) => dimensionLabels[dimension]);
}

export function applyReviewToCoffeeProfileState(
  state: CoffeeProfileState,
  review: CoffeeProfileReviewInput,
) {
  const weight = getReviewSignalWeight(review.rating);
  let nextScores = { ...state.scores };

  const drinkScores = getDrinkScores(review.drink);
  if (drinkScores) {
    nextScores = addPartialScores(nextScores, scaleScores(drinkScores, weight));
  }

  for (const tag of review.tags) {
    const tagScores = getTagScores(tag);
    if (tagScores) {
      nextScores = addPartialScores(nextScores, scaleScores(tagScores, weight));
    }
  }

  const nextReviewCount = state.reviewCount + 1;
  return createCoffeeProfileState(nextScores, {
    reviewCount: nextReviewCount,
    source: "quiz+reviews",
  });
}

function getProfileSignalWeights(
  profile: CoffeeProfile,
  scores?: CoffeeProfilerScores | null,
) {
  const next = defaultProfilerScores();

  if (scores && sumProfilerScores(scores) > 0) {
    const total = sumProfilerScores(scores);
    for (const dimension of PROFILER_DIMENSIONS) {
      next[dimension] = scores[dimension] / total;
    }
    return next;
  }

  for (const dimension of profile.traits) {
    next[dimension] += 1;
  }

  for (const dimension of profile.secondaryTraits ?? []) {
    next[dimension] += 0.6;
  }

  const total = sumProfilerScores(next) || 1;
  for (const dimension of PROFILER_DIMENSIONS) {
    next[dimension] = next[dimension] / total;
  }

  return next;
}

function getCafeSignalScores(cafe: Cafe) {
  const combinedSignals = [
    ...cafe.tags,
    ...cafe.drinks,
    ...cafe.roasters,
    cafe.summary,
    cafe.trustPreview.recentQuote,
    ...cafe.trustPreview.topMentions,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const scores = defaultProfilerScores();
  const reasons: string[] = [];

  for (const contribution of cafeSignalContributions) {
    if (!combinedSignals.includes(contribution.keyword)) {
      continue;
    }

    for (const [dimension, value] of Object.entries(contribution.scores)) {
      scores[dimension as CoffeeProfilerDimension] += Number(value ?? 0);
    }

    if (contribution.reason && !reasons.includes(contribution.reason)) {
      reasons.push(contribution.reason);
    }
  }

  return { scores, reasons };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function getCafeProfileMatch(
  cafe: Cafe,
  profile: CoffeeProfile,
  profileState?: CoffeeProfileState | null,
): CafeProfileMatch {
  const profileWeights = getProfileSignalWeights(profile, profileState?.scores);
  const cafeSignals = getCafeSignalScores(cafe);
  let overlap = 0;

  for (const dimension of PROFILER_DIMENSIONS) {
    overlap += profileWeights[dimension] * Math.min(cafeSignals.scores[dimension], 3);
  }

  const qualityScore =
    Math.min(cafe.reviewSummary.averageRating, 10) / 10 * 0.72 +
    Math.min(cafe.reviewSummary.reviewCount, 20) / 20 * 0.28;
  const rawScore = overlap * 2.2 + qualityScore * 2.4;
  const percentage = clamp(Math.round(58 + rawScore * 10), 62, 98);
  const label =
    percentage >= 92
      ? "Excellent fit"
      : percentage >= 84
        ? "Great fit"
        : percentage >= 75
          ? "Good fit"
          : "Potential fit";

  const topProfileTraits = getCoffeeProfileTopTraits(profileState?.scores ?? getProfileSignalWeights(profile), 2);
  const reasons = cafeSignals.reasons.slice(0, 2);

  if (reasons.length < 2) {
    for (const dimension of topProfileTraits) {
      const labelText = dimensionLabels[dimension];
      if (!reasons.includes(labelText)) {
        reasons.push(labelText);
      }
      if (reasons.length === 2) {
        break;
      }
    }
  }

  return {
    rawScore,
    percentage,
    label,
    reasons,
  };
}

export function getCafeProfileMatchScore(
  cafe: Cafe,
  profile: CoffeeProfile,
  profileState?: CoffeeProfileState | null,
) {
  return getCafeProfileMatch(cafe, profile, profileState).rawScore;
}
