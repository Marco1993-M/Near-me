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
  recommendedDrinks: string[];
  lookFor: string[];
  avoid: string[];
};

export const COFFEE_PROFILER_STORAGE_KEY = "near-me-coffee-profile";
export const COFFEE_PROFILER_EVENT = "near-me-coffee-profile-updated";

export function getStoredCoffeeProfileSlug() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(COFFEE_PROFILER_STORAGE_KEY);
}

export function getStoredCoffeeProfileSlugServerSnapshot() {
  return null;
}

export function subscribeToCoffeeProfile(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key === COFFEE_PROFILER_STORAGE_KEY) {
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

export const coffeeProfilerQuestions: CoffeeProfilerQuestion[] = [
  {
    question: "Your ideal coffee moment feels like...",
    type: "single",
    options: [
      { text: "A bright, energizing start", scores: { acidity: 2, fruity: 1 } },
      { text: "A comforting daily ritual", scores: { sweet: 2, body: 1 } },
      { text: "A slow, thoughtful coffee break", scores: { body: 2, floral: 1 } },
    ],
  },
  {
    question: "You usually prefer coffee that tastes...",
    type: "single",
    options: [
      { text: "Light and juicy", scores: { acidity: 2, fruity: 2 } },
      { text: "Balanced and smooth", scores: { sweet: 1, body: 1 } },
      { text: "Bold and deeper", scores: { body: 2, intensity: 2 } },
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
      { text: "Caramel / honey", scores: { sweet: 2 } },
      { text: "Spice / dark sugar", scores: { spicy: 2, intensity: 1 } },
    ],
  },
  {
    question: "If you order coffee out, you’re most likely choosing...",
    type: "single",
    options: [
      { text: "Filter / pour over", scores: { acidity: 2, fruity: 1, floral: 1 } },
      { text: "Flat white / cappuccino", scores: { sweet: 1, body: 2 } },
      { text: "Espresso / cortado", scores: { intensity: 2, body: 1 } },
    ],
  },
  {
    question: "When coffee gets too extreme, what puts you off?",
    type: "single",
    options: [
      { text: "Too dark and bitter", scores: { acidity: 1, fruity: 1 } },
      { text: "Too sharp and sour", scores: { sweet: 1, body: 1 } },
      { text: "Too thin and forgettable", scores: { body: 2, intensity: 1 } },
    ],
  },
];

export const coffeeProfiles: CoffeeProfile[] = [
  {
    slug: "bright-fruit-forward",
    name: "Bright Fruit-Forward Explorer",
    shortName: "Fruit Forward",
    description: "You gravitate toward lively, expressive coffees with clarity, fruit, and sparkle.",
    traits: ["fruity", "acidity", "floral"],
    recommendedDrinks: ["Filter", "Pour over", "Light espresso"],
    lookFor: ["Filter-first cafes", "Single-origin menus", "Clean and juicy coffees"],
    avoid: ["Dark, generic roast profiles"],
  },
  {
    slug: "sweet-comfort",
    name: "Sweet Comfort Drinker",
    shortName: "Sweet Comfort",
    description: "You like rounded, easy-drinking coffees that feel warm, sweet, and welcoming.",
    traits: ["sweet", "body"],
    recommendedDrinks: ["Flat white", "Cappuccino", "House blend"],
    lookFor: ["Balanced espresso", "Milk drink specialists", "Welcoming everyday cafes"],
    avoid: ["Overly sharp, acidic cups"],
  },
  {
    slug: "rich-chocolate",
    name: "Rich Chocolate Loyalist",
    shortName: "Rich Chocolate",
    description: "You enjoy fuller-bodied coffees with cocoa, nutty depth, and a satisfying finish.",
    traits: ["nutty", "body", "intensity"],
    recommendedDrinks: ["Cortado", "Espresso", "Flat white"],
    lookFor: ["Chocolatey espresso", "Comforting roast profiles", "Roaster-led spots"],
    avoid: ["Thin or overly floral brews"],
  },
  {
    slug: "bold-complex",
    name: "Bold Complex Taster",
    shortName: "Bold Complex",
    description: "You appreciate intensity, spice, and deeper flavor structure when it still feels intentional.",
    traits: ["spicy", "intensity", "body"],
    recommendedDrinks: ["Espresso", "Cortado", "Signature house drinks"],
    lookFor: ["Confident espresso bars", "Interesting seasonal menus", "Strong barista identity"],
    avoid: ["Flat, one-note chain coffee"],
  },
  {
    slug: "balanced-curious",
    name: "Balanced Curious Drinker",
    shortName: "Balanced Curious",
    description: "You want quality and personality, but still with harmony and approachability in the cup.",
    traits: ["sweet", "acidity", "body"],
    recommendedDrinks: ["Flat white", "Filter", "Seasonal espresso"],
    lookFor: ["Well-rounded specialty cafes", "Thoughtful menus", "Places with a bit of everything"],
    avoid: ["Extremes without balance"],
  },
];

export function applyProfilerOptionScores(
  scores: CoffeeProfilerScores,
  option: CoffeeProfilerOption,
): CoffeeProfilerScores {
  const next = { ...scores };

  for (const [key, value] of Object.entries(option.scores)) {
    next[key as CoffeeProfilerDimension] += value ?? 0;
  }

  return next;
}

export function resolveCoffeeProfile(scores: CoffeeProfilerScores): CoffeeProfile {
  let winner = coffeeProfiles[0];
  let highestScore = Number.NEGATIVE_INFINITY;

  for (const profile of coffeeProfiles) {
    const score = profile.traits.reduce((total, trait) => total + (scores[trait] ?? 0), 0);
    if (score > highestScore) {
      highestScore = score;
      winner = profile;
    }
  }

  return winner;
}

export function getCoffeeProfileBySlug(slug: string | null | undefined) {
  if (!slug) {
    return null;
  }

  return coffeeProfiles.find((profile) => profile.slug === slug) ?? null;
}

export function getCafeProfileMatchScore(cafe: Cafe, profile: CoffeeProfile) {
  let score = 0;
  const combinedSignals = [...cafe.tags, ...cafe.drinks, ...cafe.roasters].join(" ").toLowerCase();

  if (profile.slug === "bright-fruit-forward") {
    if (combinedSignals.includes("filter") || combinedSignals.includes("pour")) score += 2.4;
    if (combinedSignals.includes("top rated")) score += 1.2;
    if (combinedSignals.includes("roaster")) score += 0.8;
  }

  if (profile.slug === "sweet-comfort") {
    if (combinedSignals.includes("flat white") || combinedSignals.includes("cappuccino")) score += 2.2;
    if (combinedSignals.includes("popular")) score += 0.8;
    if (combinedSignals.includes("pastr")) score += 0.6;
  }

  if (profile.slug === "rich-chocolate") {
    if (combinedSignals.includes("espresso") || combinedSignals.includes("cortado")) score += 2;
    if (combinedSignals.includes("roaster")) score += 0.8;
    if (combinedSignals.includes("popular")) score += 0.6;
  }

  if (profile.slug === "bold-complex") {
    if (combinedSignals.includes("espresso") || combinedSignals.includes("signature")) score += 2;
    if (combinedSignals.includes("roaster")) score += 1;
    if (combinedSignals.includes("top rated")) score += 0.8;
  }

  if (profile.slug === "balanced-curious") {
    if (combinedSignals.includes("flat white") || combinedSignals.includes("filter")) score += 1.6;
    if (combinedSignals.includes("top rated")) score += 0.9;
    if (combinedSignals.includes("popular")) score += 0.7;
  }

  score += Math.min(cafe.reviewSummary.averageRating, 10) * 0.22;
  score += Math.min(cafe.reviewSummary.reviewCount, 20) * 0.045;

  return score;
}
