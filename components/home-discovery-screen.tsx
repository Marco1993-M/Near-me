"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Cafe, CafeReviewSummary, CafeTrustPreview, FallbackPlace } from "@/types/cafe";
import { CoffeeProfileCard } from "@/components/coffee-profile-card";
import { CoffeeJournalPanel } from "@/components/coffee-journal-panel";
import { DiscoveryMap } from "@/components/discovery-map";
import { ProfileMatchPill } from "@/components/profile-match-pill";
import { NEAR_ME_CANDIDATE_RULE_LABEL } from "@/lib/candidate-trust";
import { trackEvent } from "@/lib/analytics";
import { addCoffeeJournalEntry } from "@/lib/coffee-journal";
import {
  getCoffeeJournalInsight,
  getCafeJournalMemory,
  getJournalCafeMatch,
  getStoredCoffeeJournal,
  getStoredCoffeeJournalServerSnapshot,
  syncReviewEntriesIntoCoffeeJournal,
  subscribeToCoffeeJournal,
} from "@/lib/coffee-journal";
import {
  applyReviewToCoffeeProfileState,
  applyProfilerOptionScores,
  coffeeProfilerQuestions,
  createCoffeeProfileState,
  getCafeProfileMatch,
  defaultProfilerScores,
  getCafeProfileMatchScore,
  getCoffeeProfileBySlug,
  getStoredCoffeeProfileState,
  getStoredCoffeeProfileStateServerSnapshot,
  resolveCoffeeProfile,
  setStoredCoffeeProfileState,
  subscribeToCoffeeProfile,
} from "@/lib/coffee-profiler";
import { CANONICAL_TABLES } from "@/lib/db-schema";
import { getCafeDecisionGuide } from "@/lib/cafe-insights";
import { siteConfig } from "@/lib/site";
import { getSupabaseClient } from "@/lib/supabase";
import {
  getFavoriteCafeIds,
  getFavoriteCafeIdsServerSnapshot,
  subscribeToFavoriteCafes,
  toggleFavoriteCafe,
} from "@/lib/favorites";

type HomeDiscoveryScreenProps = {
  cafes: Cafe[];
  openTasteSetup?: boolean;
};

type DiscoverySource =
  | "toolbar"
  | "intro"
  | "search"
  | "top_picks"
  | "today_cup"
  | "map_marker"
  | "auto_nearby"
  | "deep_link"
  | "empty_state"
  | "fallback_card"
  | "active_card";

type ReviewTarget =
  | { type: "cafe"; cafe: Cafe }
  | { type: "fallback"; place: FallbackPlace };

type JournalTarget =
  | { type: "cafe"; cafe: Cafe }
  | { type: "fallback"; place: FallbackPlace };

type TodayCupFeedbackReason = "too-far" | "not-for-me" | "already-been" | "not-today";

type TodayCupFeedbackEntry = {
  reason: TodayCupFeedbackReason;
  skippedAt: string;
};

const reviewDrinkOptions = [
  {
    label: "Espresso",
    examples: "Espresso, macchiato, cortado",
  },
  {
    label: "Milk drink",
    examples: "Flat white, cappuccino, latte",
  },
  {
    label: "Filter",
    examples: "Pour over, batch, manual brew",
  },
  {
    label: "Cold",
    examples: "Iced latte, cold brew",
  },
  {
    label: "Seasonal",
    examples: "Signature or rotating special",
  },
] as const;
const reviewTags = [
  "Balanced",
  "Chocolatey",
  "Fruity",
  "Floral",
  "Smooth",
  "Bold",
  "Specialty coffee",
  "Quiet",
];
const journalTags = [
  "Bright",
  "Sweet",
  "Chocolatey",
  "Fruity",
  "Floral",
  "Smooth",
  "Bold",
  "Clean",
] as const;
const radiusOptionsKm = [1, 3, 5, 10];
const TODAY_CUP_FEEDBACK_STORAGE_KEY = "near-me-today-cup-feedback";

const todayCupFeedbackCopy: Record<
  TodayCupFeedbackReason,
  { label: string; days: number }
> = {
  "too-far": { label: "Too far", days: 2 },
  "not-for-me": { label: "Not for me", days: 14 },
  "already-been": { label: "Already been", days: 3 },
  "not-today": { label: "Not today", days: 1 },
};

const journalTagHints: Record<(typeof journalTags)[number], string> = {
  Bright: "Bright usually means lively acidity rather than bitterness.",
  Sweet: "Sweet often means caramel, honey, or ripe fruit balance in the cup.",
  Chocolatey: "Chocolatey usually points to deeper, comfort-led sweetness and body.",
  Fruity: "Fruity can mean berry, citrus, tropical, or stone-fruit notes.",
  Floral: "Floral coffees can feel lighter, aromatic, and tea-like.",
  Smooth: "Smooth often means the cup feels rounded with no harsh edge.",
  Bold: "Bold usually means more intensity, roast depth, or espresso punch.",
  Clean: "Clean usually means distinct flavors and less muddiness in the cup.",
};

function slugifyReviewTag(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
}

function getAnonymousReviewerId() {
  const storageKey = "near-me-anon-reviewer-id";
  const existing = window.localStorage.getItem(storageKey);

  if (existing) {
    return existing;
  }

  const nextId = globalThis.crypto?.randomUUID?.() ?? `anon-${Date.now()}`;
  window.localStorage.setItem(storageKey, nextId);
  return nextId;
}

function getDistanceInKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) {
  const earthRadiusKm = 6371;
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const dLng = ((to.longitude - from.longitude) * Math.PI) / 180;
  const fromLat = (from.latitude * Math.PI) / 180;
  const toLat = (to.latitude * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(fromLat) * Math.cos(toLat);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(distanceKm: number) {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }

  if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)} km`;
  }

  return `${Math.round(distanceKm)} km`;
}

function getJournalDrinkFamilyLabel(drink: string | null) {
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

function getFallbackTrustSummary(place: FallbackPlace) {
  const trust = place.trust;

  if (!trust) {
    return {
      title: "Early local signal",
      body: "Not yet verified by Near Me. The first thoughtful review helps us understand whether this place belongs on the map.",
      cta: "Be first to review",
    };
  }

  if (trust.reviewCount >= 2 || trust.supporterCount >= 2) {
    return {
      title: trust.stageLabel,
      body: `${trust.reviewCount} review${trust.reviewCount === 1 ? "" : "s"} and ${trust.supporterCount} local supporter${trust.supporterCount === 1 ? "" : "s"} are already helping assess this place. ${trust.progressLabel}.`,
      cta: "Add your review",
    };
  }

  if (trust.reviewCount === 1) {
    return {
      title: trust.stageLabel,
      body: `One local review is already in. Add yours to sharpen whether this place deserves a spot on Near Me. ${trust.progressLabel}.`,
      cta: "Add your review",
    };
  }

  return {
    title: trust.stageLabel,
    body: `${trust.supporterCount} local supporter${trust.supporterCount === 1 ? "" : "s"} have already flagged this place for Near Me review. ${trust.progressLabel}.`,
    cta: "Review this place",
  };
}

type TodayCupMoment = {
  key: "morning" | "midday" | "afternoon" | "evening";
  label: string;
  shortLabel: string;
  cue: string;
};

function getTodayCupMoment(hour: number): TodayCupMoment {
  if (hour < 11) {
    return {
      key: "morning",
      label: "Morning cup",
      shortLabel: "Morning",
      cue: "Best nearby call for your first proper cup",
    };
  }

  if (hour < 15) {
    return {
      key: "midday",
      label: "Midday reset",
      shortLabel: "Midday",
      cue: "A strong coffee stop for the middle of the day",
    };
  }

  if (hour < 18) {
    return {
      key: "afternoon",
      label: "Afternoon pick",
      shortLabel: "Afternoon",
      cue: "A thoughtful later-day stop if you want something better than routine",
    };
  }

  return {
    key: "evening",
    label: "Later cup",
    shortLabel: "Later",
    cue: "A calmer coffee stop if you still want one good cup today",
  };
}

function cafeSignalsContain(cafe: Cafe, needles: string[]) {
  const values = [...cafe.tags, ...cafe.drinks, ...cafe.roasters].map((value) => value.toLowerCase());
  return needles.some((needle) => values.some((value) => value.includes(needle)));
}

function normalizeTodayCupFeedback(input: unknown) {
  if (!input || typeof input !== "object") {
    return {} as Record<string, TodayCupFeedbackEntry>;
  }

  return Object.fromEntries(
    Object.entries(input)
      .map(([cafeId, value]) => {
        if (!value || typeof value !== "object") {
          return null;
        }

        const candidate = value as Partial<TodayCupFeedbackEntry>;
        if (
          typeof candidate.reason !== "string" ||
          !(candidate.reason in todayCupFeedbackCopy) ||
          typeof candidate.skippedAt !== "string"
        ) {
          return null;
        }

        return [cafeId, { reason: candidate.reason as TodayCupFeedbackReason, skippedAt: candidate.skippedAt }] as const;
      })
      .filter((entry): entry is readonly [string, TodayCupFeedbackEntry] => Boolean(entry)),
  );
}

function readTodayCupFeedback() {
  if (typeof window === "undefined") {
    return {} as Record<string, TodayCupFeedbackEntry>;
  }

  try {
    const raw = window.localStorage.getItem(TODAY_CUP_FEEDBACK_STORAGE_KEY);
    if (!raw) {
      return {} as Record<string, TodayCupFeedbackEntry>;
    }

    return normalizeTodayCupFeedback(JSON.parse(raw));
  } catch {
    return {} as Record<string, TodayCupFeedbackEntry>;
  }
}

function pruneTodayCupFeedback(feedback: Record<string, TodayCupFeedbackEntry>) {
  const now = Date.now();

  return Object.fromEntries(
    Object.entries(feedback).filter(([, entry]) => {
      const maxAgeDays = todayCupFeedbackCopy[entry.reason]?.days ?? 1;
      const skippedAt = new Date(entry.skippedAt).getTime();
      if (!Number.isFinite(skippedAt)) {
        return false;
      }

      return now - skippedAt < maxAgeDays * 24 * 60 * 60 * 1000;
    }),
  );
}

function writeTodayCupFeedback(feedback: Record<string, TodayCupFeedbackEntry>) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(TODAY_CUP_FEEDBACK_STORAGE_KEY, JSON.stringify(pruneTodayCupFeedback(feedback)));
}

function buildOptimisticReviewState(
  cafe: Cafe,
  input: { rating: number; note: string; selectedTags: string[] },
): { reviewSummary: CafeReviewSummary; trustPreview: CafeTrustPreview } {
  const currentCount = cafe.reviewSummary.reviewCount;
  const nextCount = currentCount + 1;
  const nextAverage =
    currentCount > 0
      ? Number((((cafe.reviewSummary.averageRating || 0) * currentCount + input.rating) / nextCount).toFixed(1))
      : input.rating;

  return {
    reviewSummary: {
      averageRating: nextAverage,
      reviewCount: nextCount,
    },
    trustPreview: {
      topMentions: Array.from(new Set([...input.selectedTags, ...cafe.trustPreview.topMentions])).slice(0, 2),
      recentQuote: input.note.trim(),
    },
  };
}

export function HomeDiscoveryScreen({ cafes, openTasteSetup = false }: HomeDiscoveryScreenProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isIntroVisible, setIsIntroVisible] = useState(false);
  const [localReviewStateByCafeId, setLocalReviewStateByCafeId] = useState<
    Record<string, { reviewSummary: CafeReviewSummary; trustPreview: CafeTrustPreview }>
  >({});
  const hydratedCafes = useMemo(
    () =>
      cafes.map((cafe) => {
        const localReviewState = localReviewStateByCafeId[cafe.id];
        return localReviewState
          ? {
              ...cafe,
              reviewSummary: localReviewState.reviewSummary,
              trustPreview: localReviewState.trustPreview,
            }
          : cafe;
      }),
    [cafes, localReviewStateByCafeId],
  );
  const mappableCafes = useMemo(
    () =>
      hydratedCafes.filter(
        (cafe) => typeof cafe.latitude === "number" && typeof cafe.longitude === "number",
      ),
    [hydratedCafes],
  );
  const [activeCafeId, setActiveCafeId] = useState<string | null>(null);
  const [activeFallbackId, setActiveFallbackId] = useState<string | null>(null);
  const [panToActiveCafeToken, setPanToActiveCafeToken] = useState(0);
  const [panToFallbackPlaceToken, setPanToFallbackPlaceToken] = useState(0);
  const [locateRequestToken, setLocateRequestToken] = useState(0);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedRadiusKm, setSelectedRadiusKm] = useState(3);
  const [locationState, setLocationState] = useState<
    "idle" | "requesting" | "granted" | "denied" | "unavailable"
  >("idle");
  const [sheetState, setSheetState] = useState<"collapsed" | "expanded">("collapsed");
  const [isCafeCardVisible, setIsCafeCardVisible] = useState(false);
  const [todayCupFeedbackByCafeId, setTodayCupFeedbackByCafeId] = useState<Record<string, TodayCupFeedbackEntry>>({});
  const [isTopPicksOpen, setIsTopPicksOpen] = useState(false);
  const [topPickLens, setTopPickLens] = useState<"nearby" | "worth-it" | "work" | "for-you">("nearby");
  const [isProfilerOpen, setIsProfilerOpen] = useState(false);
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [isJournalEntryOpen, setIsJournalEntryOpen] = useState(false);
  const [isAddShopOpen, setIsAddShopOpen] = useState(false);
  const [profilerQuestionIndex, setProfilerQuestionIndex] = useState(0);
  const [profilerScores, setProfilerScores] = useState(defaultProfilerScores);
  const [profilerSelections, setProfilerSelections] = useState<number[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewDrink, setReviewDrink] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [selectedReviewTags, setSelectedReviewTags] = useState<string[]>([]);
  const [reviewState, setReviewState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewToast, setReviewToast] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null);
  const [journalTarget, setJournalTarget] = useState<JournalTarget | null>(null);
  const [journalRating, setJournalRating] = useState(7);
  const [journalDrink, setJournalDrink] = useState<string | null>(null);
  const [journalNote, setJournalNote] = useState("");
  const [selectedJournalTags, setSelectedJournalTags] = useState<string[]>([]);
  const [journalMessage, setJournalMessage] = useState("");
  const [journalState, setJournalState] = useState<"idle" | "success" | "error">("idle");
  const [fallbackPlaces, setFallbackPlaces] = useState<FallbackPlace[]>([]);
  const [fallbackState, setFallbackState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [addShopName, setAddShopName] = useState("");
  const [addShopArea, setAddShopArea] = useState("");
  const [addShopNote, setAddShopNote] = useState("");
  const [addShopState, setAddShopState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [addShopMessage, setAddShopMessage] = useState("");
  const reviewSuccessTimeoutRef = useRef<number | null>(null);
  const reviewToastTimeoutRef = useRef<number | null>(null);
  const hasExplicitCafeSelectionRef = useRef(false);
  const hasRequestedInitialLocationRef = useRef(false);
  const previousRadiusKmRef = useRef(selectedRadiusKm);
  const lastTrackedLocationStateRef = useRef<string | null>(null);
  const profilerSourceRef = useRef<DiscoverySource>("toolbar");
  const handledTasteIntentRef = useRef(false);

  const coffeeProfileState = useSyncExternalStore(
    subscribeToCoffeeProfile,
    getStoredCoffeeProfileState,
    getStoredCoffeeProfileStateServerSnapshot,
  );
  const favoriteCafeIds = useSyncExternalStore(
    (onStoreChange) => subscribeToFavoriteCafes(() => onStoreChange()),
    getFavoriteCafeIds,
    getFavoriteCafeIdsServerSnapshot,
  );
  const journalEntries = useSyncExternalStore(
    subscribeToCoffeeJournal,
    getStoredCoffeeJournal,
    getStoredCoffeeJournalServerSnapshot,
  );
  const journalInsight = useMemo(() => getCoffeeJournalInsight(journalEntries), [journalEntries]);
  const currentHour = useMemo(() => new Date().getHours(), []);
  const todayCupMoment = useMemo(() => getTodayCupMoment(currentHour), [currentHour]);

  useEffect(() => {
    const nextFeedback = pruneTodayCupFeedback(readTodayCupFeedback());
    setTodayCupFeedbackByCafeId(nextFeedback);
    writeTodayCupFeedback(nextFeedback);
  }, []);

  useEffect(() => {
    if (!openTasteSetup || handledTasteIntentRef.current) {
      return;
    }

    handledTasteIntentRef.current = true;
    openProfiler("deep_link");
    router.replace(pathname, { scroll: false });
  }, [openTasteSetup, pathname, router]);

  const cafeDistances = useMemo(() => {
    if (!userLocation) {
      return new Map<string, number>();
    }

    return new Map(
      mappableCafes.map((cafe) => [
        cafe.id,
        getDistanceInKm(userLocation, {
          latitude: cafe.latitude ?? 0,
          longitude: cafe.longitude ?? 0,
        }),
      ]),
    );
  }, [mappableCafes, userLocation]);

  const activeCafe = activeCafeId
    ? mappableCafes.find((cafe) => cafe.id === activeCafeId) ??
      hydratedCafes.find((cafe) => cafe.id === activeCafeId) ??
      null
    : null;
  const activeCoffeeProfile = useMemo(
    () => getCoffeeProfileBySlug(coffeeProfileState?.profileSlug),
    [coffeeProfileState?.profileSlug],
  );
  const journalMatchByCafeId = useMemo(
    () =>
      new Map(
        mappableCafes.map((cafe) => [cafe.id, getJournalCafeMatch(cafe, journalEntries)] as const),
      ),
    [journalEntries, mappableCafes],
  );
  const cafesByDistance = useMemo(() => {
    if (!userLocation) {
      return mappableCafes;
    }

    return [...mappableCafes].sort((left, right) => {
      const leftDistance = cafeDistances.get(left.id) ?? Number.POSITIVE_INFINITY;
      const rightDistance = cafeDistances.get(right.id) ?? Number.POSITIVE_INFINITY;
      const leftRating = left.reviewSummary.reviewCount > 0 ? left.reviewSummary.averageRating : 6.5;
      const rightRating = right.reviewSummary.reviewCount > 0 ? right.reviewSummary.averageRating : 6.5;
      const leftPopularityBoost = Math.min(left.reviewSummary.reviewCount, 24) * 0.035;
      const rightPopularityBoost = Math.min(right.reviewSummary.reviewCount, 24) * 0.035;
      const leftRadiusBonus = leftDistance <= selectedRadiusKm ? 1.25 : -Math.min(leftDistance - selectedRadiusKm, 8) * 0.16;
      const rightRadiusBonus = rightDistance <= selectedRadiusKm ? 1.25 : -Math.min(rightDistance - selectedRadiusKm, 8) * 0.16;
      const leftJournalBoost = (journalMatchByCafeId.get(left.id)?.score ?? 0) * 0.22;
      const rightJournalBoost = (journalMatchByCafeId.get(right.id)?.score ?? 0) * 0.22;
      const leftNearbyScore = leftRating + leftPopularityBoost + leftRadiusBonus + leftJournalBoost - leftDistance * 0.22;
      const rightNearbyScore = rightRating + rightPopularityBoost + rightRadiusBonus + rightJournalBoost - rightDistance * 0.22;

      if (Math.abs(rightNearbyScore - leftNearbyScore) > 0.08) {
        return rightNearbyScore - leftNearbyScore;
      }

      if (Math.abs(leftDistance - rightDistance) > 0.12) {
        return leftDistance - rightDistance;
      }

      return rightRating - leftRating;
    });
  }, [cafeDistances, journalMatchByCafeId, mappableCafes, selectedRadiusKm, userLocation]);
  const rankedCafes = useMemo(() => {
    if (!activeCafe) {
      return cafesByDistance;
    }

    return [activeCafe, ...cafesByDistance.filter((cafe) => cafe.id !== activeCafe.id)];
  }, [activeCafe, cafesByDistance]);
  const activeTags = activeCafe?.tags.slice(0, 3) ?? [];
  const activeTrustMentions = activeCafe?.trustPreview.topMentions.slice(0, 2) ?? [];
  const activeTrustQuote = activeCafe?.trustPreview.recentQuote ?? null;
  const activeDecisionGuide = activeCafe ? getCafeDecisionGuide(activeCafe) : null;
  const activeJournalMemory = activeCafe
    ? getCafeJournalMemory(journalEntries, { cafeId: activeCafe.id, cafeName: activeCafe.name })
    : null;
  const activeProfileMatch =
    activeCafe && activeCoffeeProfile
      ? getCafeProfileMatch(activeCafe, activeCoffeeProfile, coffeeProfileState)
      : null;
  const activeJournalMatch = activeCafe ? journalMatchByCafeId.get(activeCafe.id) ?? null : null;
  const journalDiscoveryCue =
    journalEntries.length > 0
      ? journalInsight.favoriteDrink
        ? `Using your journal: ${journalInsight.primaryTaste?.toLowerCase() ?? "coffee"} lean and ${getJournalDrinkFamilyLabel(journalInsight.favoriteDrink) ?? "recent cups"}`
        : journalInsight.primaryTaste
          ? `Using your journal: ${journalInsight.primaryTaste.toLowerCase()} taste lean`
          : null
      : null;
  const activeRating =
    activeCafe && activeCafe.reviewSummary.reviewCount > 0
      ? activeCafe.reviewSummary.averageRating.toFixed(1)
      : null;
  const activeDistance = activeCafe && userLocation ? cafeDistances.get(activeCafe.id) ?? null : null;
  const directionsHref =
    activeCafe && typeof activeCafe.latitude === "number" && typeof activeCafe.longitude === "number"
      ? `https://www.google.com/maps/search/?api=1&query=${activeCafe.latitude},${activeCafe.longitude}`
      : null;
  const isActiveCafeSaved = activeCafe ? favoriteCafeIds.includes(activeCafe.id) : false;
  const canRetryLocation = locationState === "denied" || locationState === "unavailable";
  const isOverlayOpen =
    isSearchOpen || isTopPicksOpen || isProfilerOpen || isJournalOpen || isJournalEntryOpen || isAddShopOpen;
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!normalizedSearchQuery) {
      return rankedCafes.slice(0, 8);
    }

    return rankedCafes.filter((cafe) =>
      [cafe.name, cafe.city, ...cafe.roasters, ...cafe.tags, ...cafe.drinks].some((value) =>
        value.toLowerCase().includes(normalizedSearchQuery),
      ),
    );
  }, [normalizedSearchQuery, rankedCafes]);
  const topPickGroups = useMemo(() => {
    const nearby = rankedCafes.slice(0, 6);
    const worthIt = [...mappableCafes]
      .sort((left, right) => {
        const leftDistance = cafeDistances.get(left.id) ?? 999;
        const rightDistance = cafeDistances.get(right.id) ?? 999;
        const leftScore = left.reviewSummary.averageRating * 1.1 + Math.min(left.reviewSummary.reviewCount, 20) * 0.04 - leftDistance * 0.12;
        const rightScore = right.reviewSummary.averageRating * 1.1 + Math.min(right.reviewSummary.reviewCount, 20) * 0.04 - rightDistance * 0.12;
        return rightScore - leftScore;
      })
      .slice(0, 6);
    const work = [...mappableCafes]
      .filter((cafe) =>
        cafe.tags.some((tag) =>
          ["Laptop-friendly", "Quiet", "Traveler-friendly"].includes(tag),
        ),
      )
      .sort((left, right) => {
        const leftDistance = cafeDistances.get(left.id) ?? 999;
        const rightDistance = cafeDistances.get(right.id) ?? 999;
        const leftScore = left.reviewSummary.averageRating + Math.min(left.reviewSummary.reviewCount, 18) * 0.03 - leftDistance * 0.18;
        const rightScore = right.reviewSummary.averageRating + Math.min(right.reviewSummary.reviewCount, 18) * 0.03 - rightDistance * 0.18;
        return rightScore - leftScore;
      })
      .slice(0, 6);
    const forYou = activeCoffeeProfile || journalEntries.length > 0
      ? [...mappableCafes]
          .sort((left, right) => {
            const leftDistance = cafeDistances.get(left.id) ?? 999;
            const rightDistance = cafeDistances.get(right.id) ?? 999;
            const leftRadiusBonus = leftDistance <= selectedRadiusKm ? 0.8 : -Math.min(leftDistance - selectedRadiusKm, 8) * 0.08;
            const rightRadiusBonus = rightDistance <= selectedRadiusKm ? 0.8 : -Math.min(rightDistance - selectedRadiusKm, 8) * 0.08;
            const leftJournalScore = journalMatchByCafeId.get(left.id)?.score ?? 0;
            const rightJournalScore = journalMatchByCafeId.get(right.id)?.score ?? 0;
            const leftScore =
              (activeCoffeeProfile ? getCafeProfileMatchScore(left, activeCoffeeProfile, coffeeProfileState) : 0) +
              leftJournalScore * 1.2 +
              leftRadiusBonus -
              leftDistance * 0.12;
            const rightScore =
              (activeCoffeeProfile ? getCafeProfileMatchScore(right, activeCoffeeProfile, coffeeProfileState) : 0) +
              rightJournalScore * 1.2 +
              rightRadiusBonus -
              rightDistance * 0.12;
            return rightScore - leftScore;
          })
          .slice(0, 6)
      : [];

    return { nearby, worthIt, work, forYou };
  }, [activeCoffeeProfile, cafeDistances, coffeeProfileState, journalEntries.length, journalMatchByCafeId, mappableCafes, rankedCafes, selectedRadiusKm]);
  const activeTopPicks =
    topPickLens === "nearby"
      ? topPickGroups.nearby
      : topPickLens === "worth-it"
        ? topPickGroups.worthIt
        : topPickLens === "work"
          ? topPickGroups.work
          : topPickGroups.forYou;
  const topPickCopy =
    topPickLens === "nearby"
      ? {
          title: "Best nearby",
          subtitle: "Fast picks around you right now",
        }
      : topPickLens === "worth-it"
        ? {
            title: "Worth the detour",
            subtitle: "Higher-quality spots still worth a longer stop",
          }
        : topPickLens === "work"
          ? {
            title: "Work-friendly",
            subtitle: "Quiet, laptop-friendly places to settle in",
          }
          : {
            title: activeCoffeeProfile ? `For your ${activeCoffeeProfile.shortName} taste` : "For your journal",
            subtitle: activeCoffeeProfile
              ? `Recommendations shaped around ${activeCoffeeProfile.recommendedDrinks.join(", ")} and your recent journal patterns`
              : journalEntries.length > 0
                ? "Recommendations shaped around the drinks and taste notes you keep coming back to"
                : "Start the 5-question taste setup to unlock taste-aware picks",
          };
  const cafesWithinRadius = useMemo(() => {
    if (!userLocation) {
      return cafesByDistance;
    }

    return cafesByDistance.filter((cafe) => {
      const distance = cafeDistances.get(cafe.id);
      return typeof distance === "number" && distance <= selectedRadiusKm;
    });
  }, [cafeDistances, cafesByDistance, selectedRadiusKm, userLocation]);
  const nextRadiusKm = radiusOptionsKm.find((radiusKm) => radiusKm > selectedRadiusKm) ?? null;
  const hasNoRadiusMatches = Boolean(userLocation) && cafesWithinRadius.length === 0;
  const activeFallbackPlace =
    fallbackPlaces.find((place) => place.id === activeFallbackId) ??
    (hasNoRadiusMatches ? fallbackPlaces[0] ?? null : null);
  const isCollapsedCard = sheetState === "collapsed";
  const isExpandedCard = sheetState === "expanded";
  const shouldShowIntro =
    isIntroVisible &&
    !isOverlayOpen &&
    sheetState === "collapsed" &&
    !hasNoRadiusMatches &&
    !activeFallbackPlace;
  const emptyStateTitle =
    fallbackPlaces.length > 0
      ? `No Near Me picks in ${selectedRadiusKm} km`
      : `No specialty spots in ${selectedRadiusKm} km`;
  const emptyStateBody =
    fallbackPlaces.length > 0
      ? "We found a few nearby options, but they are not yet verified by Near Me."
      : "Nothing in the current radius yet. Expand the search or help put this area on Near Me.";
  const activeJournalHint =
    selectedJournalTags.length > 0
      ? journalTagHints[selectedJournalTags[selectedJournalTags.length - 1] as keyof typeof journalTagHints]
      : "Add one or two simple descriptors and Near Me will slowly sharpen your coffee vocabulary.";

  const todayCupRanked = useMemo(() => {
    if (!userLocation) {
      return [];
    }

    const candidatePool =
      cafesWithinRadius.length > 0
        ? cafesWithinRadius.slice(0, 12)
        : cafesByDistance.slice(0, 12);

    return candidatePool
      .map((cafe) => {
        const distance = cafeDistances.get(cafe.id) ?? Number.POSITIVE_INFINITY;
        const reviewCount = cafe.reviewSummary.reviewCount;
        const rating = reviewCount > 0 ? cafe.reviewSummary.averageRating : 6.7;
        const popularityBoost = Math.min(reviewCount, 18) * 0.06;
        const radiusBonus = distance <= selectedRadiusKm ? 1.2 : -Math.min(distance - selectedRadiusKm, 8) * 0.18;
        const profileScore = activeCoffeeProfile ? getCafeProfileMatchScore(cafe, activeCoffeeProfile, coffeeProfileState) : 0;
        const journalMatch = journalMatchByCafeId.get(cafe.id) ?? null;
        const journalScore = journalMatch?.score ?? 0;

        let momentBoost = 0;
        if (todayCupMoment.key === "morning") {
          if (cafeSignalsContain(cafe, ["cortado", "flat white", "cappuccino", "latte", "espresso"])) {
            momentBoost += 1.2;
          }
          if (cafeSignalsContain(cafe, ["specialty coffee", "roaster"])) {
            momentBoost += 0.35;
          }
        } else if (todayCupMoment.key === "midday") {
          if (cafeSignalsContain(cafe, ["quiet", "laptop-friendly", "traveler-friendly"])) {
            momentBoost += 1.1;
          }
          if (cafeSignalsContain(cafe, ["flat white", "cappuccino", "filter"])) {
            momentBoost += 0.45;
          }
        } else if (todayCupMoment.key === "afternoon") {
          if (cafeSignalsContain(cafe, ["filter", "pour over", "fruity", "floral"])) {
            momentBoost += 1.15;
          }
          if (cafeSignalsContain(cafe, ["seasonal", "signature"])) {
            momentBoost += 0.45;
          }
        } else {
          if (cafeSignalsContain(cafe, ["quiet", "traveler-friendly"])) {
            momentBoost += 0.8;
          }
          if (cafeSignalsContain(cafe, ["chocolatey", "smooth", "flat white", "latte"])) {
            momentBoost += 0.5;
          }
        }

        const totalScore =
          rating * 0.86 +
          popularityBoost +
          radiusBonus +
          profileScore * 0.9 +
          journalScore * 1.16 +
          momentBoost -
          distance * 0.2;

        return {
          cafe,
          distance,
          totalScore,
          decisionGuide: getCafeDecisionGuide(cafe),
          journalMatch,
          profileMatch:
            activeCoffeeProfile ? getCafeProfileMatch(cafe, activeCoffeeProfile, coffeeProfileState) : null,
        };
      })
      .filter((candidate) => !todayCupFeedbackByCafeId[candidate.cafe.id])
      .sort((left, right) => right.totalScore - left.totalScore);
  }, [
    activeCoffeeProfile,
    cafesByDistance,
    cafeDistances,
    cafesWithinRadius,
    coffeeProfileState,
    journalMatchByCafeId,
    selectedRadiusKm,
    todayCupFeedbackByCafeId,
    todayCupMoment.key,
    userLocation,
  ]);

  const todayCupPrimary = todayCupRanked[0] ?? null;
  const todayCupBackups = todayCupRanked.slice(1, 3);
  const shouldShowTodayCup =
    !shouldShowIntro &&
    !isOverlayOpen &&
    !hasNoRadiusMatches &&
    !activeFallbackPlace &&
    Boolean(todayCupPrimary);
  useEffect(() => {
    if (!userLocation) {
      setFallbackPlaces([]);
      setActiveFallbackId(null);
      setFallbackState("idle");
      return;
    }

    const controller = new AbortController();
    const searchParams = new URLSearchParams({
      lat: String(userLocation.latitude),
      lng: String(userLocation.longitude),
      radiusKm: String(selectedRadiusKm),
    });

    setFallbackState("loading");

    void fetch(`/api/fallback-cafes?${searchParams.toString()}`, {
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((payload: { places?: FallbackPlace[] }) => {
        if (controller.signal.aborted) {
          return;
        }

        const places = payload.places ?? [];
        setFallbackPlaces(places);
        setActiveFallbackId((current) =>
          current && places.some((place) => place.id === current) ? current : null,
        );
        setFallbackState("ready");
      })
      .catch(() => {
        if (controller.signal.aborted) {
          return;
        }

        setFallbackPlaces([]);
        setActiveFallbackId(null);
        setFallbackState("error");
      });

    return () => controller.abort();
  }, [selectedRadiusKm, userLocation]);

  useEffect(() => {
    const supabase = getSupabaseClient();

    if (!supabase || typeof window === "undefined") {
      return;
    }

    const anonId = getAnonymousReviewerId();
    const knownCafes = new Map(hydratedCafes.map((cafe) => [cafe.id, cafe] as const));
    let cancelled = false;

    void supabase
      .from(CANONICAL_TABLES.reviews)
      .select("id,cafe_id,rating,note,drink,created_at")
      .eq("anon_id", anonId)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled || error || !data?.length) {
          return;
        }

        const reviewEntries = data
          .map((review) => {
            const cafe = knownCafes.get(review.cafe_id);

            if (!cafe || !review.drink) {
              return null;
            }

            return {
              reviewId: review.id,
              cafeId: review.cafe_id,
              cafeName: cafe.name,
              city: cafe.city,
              drink: review.drink,
              rating: review.rating,
              note: review.note ?? "",
              createdAt: review.created_at,
            };
          })
          .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

        if (reviewEntries.length > 0) {
          syncReviewEntriesIntoCoffeeJournal(reviewEntries);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hydratedCafes]);

  async function handleAddShopSubmit() {
    if (!addShopName.trim()) {
      setAddShopState("error");
      setAddShopMessage("Add the cafe name first.");
      return;
    }

    setAddShopState("submitting");
    setAddShopMessage("");

    try {
      const response = await fetch("/api/shop-suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: addShopName.trim(),
          area: addShopArea.trim(),
          note: addShopNote.trim(),
          latitude: userLocation?.latitude ?? null,
          longitude: userLocation?.longitude ?? null,
        }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
        trust?: {
          reviewCount: number;
          supporterCount: number;
          stageLabel: string;
        };
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Could not submit shop.");
      }

      trackEvent("add_shop_submitted", {
        area: addShopArea.trim() || null,
        has_location: Boolean(userLocation),
      });
      setAddShopState("success");
      const trustLine = payload.trust
        ? payload.trust.supporterCount > 1 || payload.trust.reviewCount > 0
          ? `${payload.trust.stageLabel}. ${payload.trust.supporterCount} local supporters so far.`
          : `${payload.trust.stageLabel}. You started the signal for this place.`
        : "Shop sent for review. Thanks for helping grow Near Me.";
      setAddShopMessage(trustLine);
      setReviewToast(`Shop submitted: ${addShopName.trim()}`);

      if (reviewToastTimeoutRef.current) {
        window.clearTimeout(reviewToastTimeoutRef.current);
      }
      reviewToastTimeoutRef.current = window.setTimeout(() => {
        setReviewToast(null);
        reviewToastTimeoutRef.current = null;
      }, 2600);

      window.setTimeout(() => {
        closeAddShopModal();
      }, 420);
    } catch (error) {
      setAddShopState("error");
      setAddShopMessage(error instanceof Error ? error.message : "Could not submit shop.");
    }
  }

  function selectCafe(
    cafeId: string,
    options?: {
      explicit?: boolean;
      pan?: boolean;
      nextSheetState?: "collapsed" | "expanded";
      source?: DiscoverySource;
    },
  ) {
    const explicit = options?.explicit ?? true;

    if (explicit) {
      hasExplicitCafeSelectionRef.current = true;
      setIsCafeCardVisible(true);
    } else {
      setIsCafeCardVisible(false);
    }

    dismissIntro();
    setActiveFallbackId(null);
    setActiveCafeId(cafeId);

    if (options?.source) {
      const selectedCafe =
        mappableCafes.find((cafe) => cafe.id === cafeId) ??
        hydratedCafes.find((cafe) => cafe.id === cafeId) ??
        null;
      trackEvent("cafe_selected", {
        source: options.source,
        cafe_slug: selectedCafe?.slug ?? null,
        city: selectedCafe?.city ?? null,
      });
    }

    if (options?.pan) {
      setPanToActiveCafeToken((current) => current + 1);
    }

    if (options?.nextSheetState) {
      setSheetState(options.nextSheetState);
    }
  }

  function selectFallbackPlace(
    placeId: string,
    options?: {
      pan?: boolean;
      source?: DiscoverySource;
    },
  ) {
    hasExplicitCafeSelectionRef.current = false;
    setIsCafeCardVisible(false);
    dismissIntro();
    setActiveCafeId(null);
    setActiveFallbackId(placeId);
    setSheetState("collapsed");

    if (options?.source) {
      const selectedPlace = fallbackPlaces.find((place) => place.id === placeId) ?? null;
      trackEvent("fallback_place_selected", {
        source: options.source,
        place_name: selectedPlace?.name ?? null,
        city: selectedPlace?.city ?? null,
      });
    }

    if (options?.pan) {
      setPanToFallbackPlaceToken((current) => current + 1);
    }
  }

  useEffect(() => {
    if (!pathname?.startsWith("/cafes/")) {
      return;
    }

    const slug = decodeURIComponent(pathname.replace(/^\/cafes\//, "").split("/")[0] ?? "").trim();

    if (!slug) {
      return;
    }

    const matchedCafe =
      mappableCafes.find((cafe) => cafe.slug === slug) ?? hydratedCafes.find((cafe) => cafe.slug === slug);

    if (!matchedCafe) {
      return;
    }

    hasExplicitCafeSelectionRef.current = true;
    setIsCafeCardVisible(true);
    setActiveCafeId((current) => (current === matchedCafe.id ? current : matchedCafe.id));
    setSheetState("expanded");
    setIsSearchOpen(false);
    setIsTopPicksOpen(false);
    setIsProfilerOpen(false);
    trackEvent("cafe_selected", {
      source: "deep_link",
      cafe_slug: matchedCafe.slug,
      city: matchedCafe.city,
    });
  }, [hydratedCafes, mappableCafes, pathname]);

  useEffect(() => {
    if (mappableCafes.length === 0) {
      setActiveCafeId(null);
      setIsCafeCardVisible(false);
      return;
    }

    if (!userLocation && !hasExplicitCafeSelectionRef.current) {
      setActiveCafeId(null);
      setIsCafeCardVisible(false);
      return;
    }

    const radiusChanged = previousRadiusKmRef.current !== selectedRadiusKm;
    previousRadiusKmRef.current = selectedRadiusKm;
    const activeDistance = activeCafeId ? cafeDistances.get(activeCafeId) : undefined;
    const activeWithinRadius =
      !userLocation ||
      activeDistance === undefined ||
      activeDistance <= selectedRadiusKm;

    if (hasExplicitCafeSelectionRef.current && activeCafeId && (activeWithinRadius || !radiusChanged)) {
      return;
    }

    if (hasExplicitCafeSelectionRef.current && activeCafeId && !activeWithinRadius) {
      hasExplicitCafeSelectionRef.current = false;
    }

    const inRadiusCafe =
      userLocation
        ? cafesByDistance.find((cafe) => {
            const distance = cafeDistances.get(cafe.id);
            return typeof distance === "number" && distance <= selectedRadiusKm;
          }) ?? null
        : null;
    const nextSuggestedCafe = todayCupPrimary?.cafe ?? inRadiusCafe;

    if (!userLocation) {
      return;
    }

    if (!nextSuggestedCafe) {
      setActiveCafeId(null);
      setIsCafeCardVisible(false);
      return;
    }

    setActiveCafeId((current) => (current === nextSuggestedCafe.id ? current : nextSuggestedCafe.id));
    setIsCafeCardVisible(false);
    if (activeCafeId !== nextSuggestedCafe.id) {
      trackEvent("cafe_selected", {
        source: todayCupPrimary ? "today_cup" : "auto_nearby",
        cafe_slug: nextSuggestedCafe.slug,
        city: nextSuggestedCafe.city,
      });
    }
  }, [
    activeCafeId,
    cafeDistances,
    cafesByDistance,
    mappableCafes,
    selectedRadiusKm,
    todayCupPrimary,
    userLocation,
  ]);

  useEffect(() => {
    const hasDismissedIntro = window.sessionStorage.getItem("near-me-home-intro-dismissed") === "1";
    setIsIntroVisible(!hasDismissedIntro);
  }, []);

  useEffect(() => {
    if (hasRequestedInitialLocationRef.current) {
      return;
    }

    if (userLocation || locationState === "granted" || locationState === "denied" || locationState === "unavailable") {
      hasRequestedInitialLocationRef.current = true;
      return;
    }

    hasRequestedInitialLocationRef.current = true;
    requestLocation("intro");
  }, [locationState, userLocation]);

  useEffect(() => {
    if (locationState === "idle" || locationState === "requesting") {
      return;
    }

    if (lastTrackedLocationStateRef.current === locationState) {
      return;
    }

    lastTrackedLocationStateRef.current = locationState;

    if (locationState === "granted") {
      trackEvent("location_granted", {
        radius_km: selectedRadiusKm,
      });
      return;
    }

    if (locationState === "denied") {
      trackEvent("location_denied", {
        radius_km: selectedRadiusKm,
      });
      return;
    }

    trackEvent("location_unavailable", {
      radius_km: selectedRadiusKm,
    });
  }, [locationState, selectedRadiusKm]);

  useEffect(() => {
    return () => {
      if (reviewSuccessTimeoutRef.current) {
        window.clearTimeout(reviewSuccessTimeoutRef.current);
      }
      if (reviewToastTimeoutRef.current) {
        window.clearTimeout(reviewToastTimeoutRef.current);
      }
    };
  }, []);

  function dismissIntro() {
    setIsIntroVisible(false);
    window.sessionStorage.setItem("near-me-home-intro-dismissed", "1");
  }

  function requestLocation(source: DiscoverySource) {
    trackEvent("location_requested", {
      source,
      radius_km: selectedRadiusKm,
    });
    setLocateRequestToken((current) => current + 1);
  }

  function openSearch(source: DiscoverySource = "toolbar") {
    dismissIntro();
    trackEvent("search_opened", { source });
    setIsTopPicksOpen(false);
    setIsSearchOpen(true);
  }

  function closeSearch() {
    setIsSearchOpen(false);
    setSearchQuery("");
  }

  function openTopPicks(source: DiscoverySource = "toolbar") {
    dismissIntro();
    trackEvent("top_picks_opened", {
      source,
      lens: topPickLens,
    });
    setIsJournalOpen(false);
    setIsSearchOpen(false);
    setIsTopPicksOpen(true);
  }

  function openJournal(source: DiscoverySource = "toolbar") {
    dismissIntro();
    trackEvent("journal_opened", {
      source,
      entries: journalEntries.length,
    });
    setIsSearchOpen(false);
    setIsTopPicksOpen(false);
    setIsProfilerOpen(false);
    setIsAddShopOpen(false);
    setIsJournalOpen(true);
  }

  function closeJournal() {
    setIsJournalOpen(false);
  }

  function openTastePanel(source: DiscoverySource = "toolbar") {
    dismissIntro();
    setIsJournalOpen(false);
    if (activeCoffeeProfile) {
      setIsSearchOpen(false);
      setIsTopPicksOpen(true);
      setTopPickLens("for-you");
      trackEvent("top_picks_opened", {
        source,
        lens: "for-you",
        via: "your_taste",
      });
      return;
    }

    openProfiler(source);
  }

  function closeTopPicks() {
    setIsTopPicksOpen(false);
  }

  function handleTodayCupFeedback(reason: TodayCupFeedbackReason) {
    if (!todayCupPrimary) {
      return;
    }

    const nextFeedback = pruneTodayCupFeedback({
      ...todayCupFeedbackByCafeId,
      [todayCupPrimary.cafe.id]: {
        reason,
        skippedAt: new Date().toISOString(),
      },
    });

    setTodayCupFeedbackByCafeId(nextFeedback);
    writeTodayCupFeedback(nextFeedback);
    trackEvent("today_cup_skipped", {
      cafe_slug: todayCupPrimary.cafe.slug,
      reason,
      moment: todayCupMoment.key,
    });
  }

  function resetJournalForm() {
    setJournalRating(7);
    setJournalDrink(null);
    setJournalNote("");
    setSelectedJournalTags([]);
    setJournalMessage("");
    setJournalState("idle");
  }

  function openJournalEntryModal(target?: JournalTarget, source: DiscoverySource = "active_card") {
    dismissIntro();
    setIsJournalOpen(false);
    trackEvent("journal_entry_started", {
      source,
      target_type: target?.type ?? (activeCafe ? "cafe" : null),
    });
    setJournalTarget(target ?? (activeCafe ? { type: "cafe", cafe: activeCafe } : null));
    resetJournalForm();
    setIsJournalEntryOpen(true);
  }

  function closeJournalEntryModal() {
    setIsJournalEntryOpen(false);
    setJournalTarget(null);
    setJournalMessage("");
    setJournalState("idle");
  }

  function toggleJournalTag(tag: string) {
    setSelectedJournalTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag].slice(0, 3),
    );
  }

  function handleJournalSubmit() {
    if (!journalTarget) {
      return;
    }

    if (!journalDrink) {
      setJournalState("error");
      setJournalMessage("Pick what you ordered first.");
      return;
    }

    const entry = addCoffeeJournalEntry({
      cafe: journalTarget.type === "cafe" ? journalTarget.cafe : null,
      place: journalTarget.type === "fallback" ? journalTarget.place : null,
      drink: journalDrink,
      rating: journalRating,
      note: journalNote,
      tags: selectedJournalTags,
      source: "manual",
    });

    setJournalState("success");
    trackEvent("journal_entry_saved", {
      target_type: journalTarget.type,
      drink: journalDrink,
      rating: journalRating,
      tags_count: selectedJournalTags.length,
    });
    setJournalMessage("Logged privately to your coffee journal.");
    setReviewToast(`Journal saved: ${entry.cafeName}`);

    if (reviewToastTimeoutRef.current) {
      window.clearTimeout(reviewToastTimeoutRef.current);
    }
    reviewToastTimeoutRef.current = window.setTimeout(() => {
      setReviewToast(null);
      reviewToastTimeoutRef.current = null;
    }, 2600);

    window.setTimeout(() => {
      closeJournalEntryModal();
    }, 420);
  }

  function openAddShopModal(
    prefill?: { name?: string; area?: string; note?: string },
    source: DiscoverySource = "toolbar",
  ) {
    dismissIntro();
    trackEvent("add_shop_started", {
      source,
      has_prefill_name: Boolean(prefill?.name ?? searchQuery.trim()),
    });
    setIsSearchOpen(false);
    setIsTopPicksOpen(false);
    setIsProfilerOpen(false);
    setIsJournalOpen(false);
    setAddShopName(prefill?.name ?? searchQuery.trim());
    setAddShopArea(prefill?.area ?? "");
    setAddShopNote(prefill?.note ?? "");
    setAddShopState("idle");
    setAddShopMessage("");
    setIsAddShopOpen(true);
  }

  function closeAddShopModal() {
    setIsAddShopOpen(false);
  }

  function resetProfiler() {
    setProfilerQuestionIndex(0);
    setProfilerScores(defaultProfilerScores());
    setProfilerSelections([]);
  }

  function openProfiler(source: DiscoverySource = "toolbar") {
    dismissIntro();
    profilerSourceRef.current = source;
    trackEvent("taste_setup_started", {
      source,
      mode: activeCoffeeProfile ? "retune" : "first_run",
    });
    setIsSearchOpen(false);
    setIsTopPicksOpen(false);
    setIsJournalOpen(false);
    resetProfiler();
    setIsProfilerOpen(true);
  }

  function closeProfiler() {
    setIsProfilerOpen(false);
  }

  function cycleRadius() {
    const currentIndex = radiusOptionsKm.indexOf(selectedRadiusKm);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % radiusOptionsKm.length;
    const nextRadiusKm = radiusOptionsKm[nextIndex];
    trackEvent("radius_changed", {
      from_km: selectedRadiusKm,
      to_km: nextRadiusKm,
    });
    setSelectedRadiusKm(nextRadiusKm);
  }

  function saveResolvedProfile(nextScores: ReturnType<typeof defaultProfilerScores>) {
    const nextProfileState = createCoffeeProfileState(nextScores, {
      reviewCount: coffeeProfileState?.reviewCount ?? 0,
      source: coffeeProfileState?.reviewCount ? "quiz+reviews" : "quiz",
    });
    setStoredCoffeeProfileState(nextProfileState);
    trackEvent("taste_setup_completed", {
      source: profilerSourceRef.current,
      profile_slug: nextProfileState.profileSlug,
      review_count: nextProfileState.reviewCount,
    });
    setReviewToast(`Your taste is now leaning ${resolveCoffeeProfile(nextScores).name}`);

    if (reviewToastTimeoutRef.current) {
      window.clearTimeout(reviewToastTimeoutRef.current);
    }
    reviewToastTimeoutRef.current = window.setTimeout(() => {
      setReviewToast(null);
      reviewToastTimeoutRef.current = null;
    }, 2600);
  }

  function handleProfilerSingleChoice(optionIndex: number) {
    const question = coffeeProfilerQuestions[profilerQuestionIndex];
    const option = question.options[optionIndex];
    const nextScores = applyProfilerOptionScores(profilerScores, option);

    if (profilerQuestionIndex === coffeeProfilerQuestions.length - 1) {
      saveResolvedProfile(nextScores);
      setProfilerScores(nextScores);
      setIsProfilerOpen(false);
      setIsTopPicksOpen(true);
      setTopPickLens("for-you");
      return;
    }

    setProfilerScores(nextScores);
    setProfilerQuestionIndex((current) => current + 1);
  }

  function handleProfilerMultiChoice(optionIndex: number) {
    const question = coffeeProfilerQuestions[profilerQuestionIndex];
    const maxChoices = question.maxChoices ?? 1;
    const nextSelections = profilerSelections.includes(optionIndex)
      ? profilerSelections.filter((value) => value !== optionIndex)
      : profilerSelections.length < maxChoices
        ? [...profilerSelections, optionIndex]
        : profilerSelections;

    setProfilerSelections(nextSelections);

    if (nextSelections.length !== maxChoices) {
      return;
    }

    const nextScores = nextSelections.reduce(
      (scores, selectionIndex) =>
        applyProfilerOptionScores(scores, question.options[selectionIndex]),
      profilerScores,
    );

    window.setTimeout(() => {
      if (profilerQuestionIndex === coffeeProfilerQuestions.length - 1) {
        saveResolvedProfile(nextScores);
        setProfilerScores(nextScores);
        setProfilerSelections([]);
        setIsProfilerOpen(false);
        setIsTopPicksOpen(true);
        setTopPickLens("for-you");
        return;
      }

      setProfilerScores(nextScores);
      setProfilerSelections([]);
      setProfilerQuestionIndex((current) => current + 1);
    }, 220);
  }

  function resetReviewForm() {
    setReviewRating(5);
    setReviewDrink(null);
    setReviewNote("");
    setSelectedReviewTags([]);
    setReviewState("idle");
    setReviewMessage("");
  }

  function openReviewModal(target?: ReviewTarget, source: DiscoverySource = "active_card") {
    if (reviewSuccessTimeoutRef.current) {
      window.clearTimeout(reviewSuccessTimeoutRef.current);
      reviewSuccessTimeoutRef.current = null;
    }
    trackEvent("review_started", {
      source,
      target_type: target?.type ?? (activeCafe ? "cafe" : null),
    });
    setReviewTarget(target ?? (activeCafe ? { type: "cafe", cafe: activeCafe } : null));
    resetReviewForm();
    setIsReviewOpen(true);
  }

  function closeReviewModal() {
    setIsReviewOpen(false);
    setReviewState("idle");
    setReviewMessage("");
    setReviewTarget(null);
  }

  function toggleReviewTag(tag: string) {
    setSelectedReviewTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag].slice(0, 3),
    );
  }

  async function handleReviewSubmit() {
    if (!reviewTarget) {
      return;
    }

    if (!reviewDrink) {
      setReviewState("error");
      setReviewMessage("Pick what you ordered.");
      return;
    }

    if (reviewNote.trim().length < 12) {
      setReviewState("error");
      setReviewMessage("Add a short note so the review is actually useful.");
      return;
    }

    const anonId = getAnonymousReviewerId();
    const duplicateKey =
      reviewTarget.type === "cafe"
        ? `near-me-review:${reviewTarget.cafe.id}:${anonId}`
        : `near-me-fallback-review:${reviewTarget.place.source}:${reviewTarget.place.id}:${anonId}`;

    if (window.localStorage.getItem(duplicateKey)) {
      setReviewState("error");
      setReviewMessage(
        reviewTarget.type === "cafe"
          ? "You already left a review for this cafe on this device."
          : "You already reviewed this nearby option on this device.",
      );
      return;
    }

    setReviewState("submitting");
    setReviewMessage("");
    let submittedReviewId: string | undefined;

    if (reviewTarget.type === "cafe") {
      const supabase = getSupabaseClient();

      if (!supabase) {
        setReviewState("error");
        setReviewMessage("Reviews are unavailable until Supabase is configured.");
        return;
      }

      const payload = {
        cafe_id: reviewTarget.cafe.id,
        rating: reviewRating,
        note: reviewNote.trim(),
        drink: reviewDrink,
        anon_id: anonId,
        status: "approved",
        user_id: null,
      };

      const { data, error } = await supabase
        .from(CANONICAL_TABLES.reviews)
        .insert([payload])
        .select("id")
        .single();

      if (error) {
        setReviewState("error");
        setReviewMessage(error.message || "Could not submit review.");
        return;
      }

      submittedReviewId = data?.id;

      if (data?.id && selectedReviewTags.length > 0) {
        await supabase.from(CANONICAL_TABLES.reviewTags).insert(
          selectedReviewTags.map((tag) => ({
            review_id: data.id,
            tag: slugifyReviewTag(tag),
          })),
        );
      }
    } else {
      const response = await fetch("/api/fallback-reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          place: reviewTarget.place,
          rating: reviewRating,
          note: reviewNote.trim(),
          drink: reviewDrink,
          tags: selectedReviewTags,
          anonId,
        }),
      });

      const payload = (await response.json()) as { success?: boolean; error?: string };

      if (!response.ok || !payload.success) {
        setReviewState("error");
        setReviewMessage(payload.error || "Could not submit review.");
        return;
      }
    }

    window.localStorage.setItem(duplicateKey, "1");
    addCoffeeJournalEntry({
      cafe: reviewTarget.type === "cafe" ? reviewTarget.cafe : null,
      place: reviewTarget.type === "fallback" ? reviewTarget.place : null,
      drink: reviewDrink,
      rating: reviewRating,
      note: reviewNote,
      tags: selectedReviewTags,
      source: "review",
      reviewId: submittedReviewId,
    });
    if (reviewTarget.type === "cafe") {
      setLocalReviewStateByCafeId((current) => ({
        ...current,
        [reviewTarget.cafe.id]: buildOptimisticReviewState(reviewTarget.cafe, {
          rating: reviewRating,
          note: reviewNote,
          selectedTags: selectedReviewTags,
        }),
      }));
    }

    let nextProfileName: string | null = null;
    if (coffeeProfileState) {
      const nextProfileState = applyReviewToCoffeeProfileState(coffeeProfileState, {
        rating: reviewRating,
        drink: reviewDrink,
        tags: selectedReviewTags,
      });
      setStoredCoffeeProfileState(nextProfileState);
      nextProfileName = resolveCoffeeProfile(nextProfileState.scores).name;
    }

    setReviewState("success");
    trackEvent("review_submitted", {
      target_type: reviewTarget.type,
      drink: reviewDrink,
      rating: reviewRating,
      tags_count: selectedReviewTags.length,
    });
    setReviewMessage(
      reviewTarget.type === "cafe"
        ? nextProfileName
          ? `Review sent. Your taste profile is now leaning ${nextProfileName}.`
          : "Review sent. Thanks for helping the next coffee run."
        : "Review sent. We will use it to assess this nearby option for Near Me.",
    );
    setReviewToast(
      reviewTarget.type === "cafe"
        ? nextProfileName
          ? `Review saved for ${reviewTarget.cafe.name} · ${nextProfileName}`
          : `Review saved for ${reviewTarget.cafe.name}`
        : `Review submitted for ${reviewTarget.place.name}`,
    );

    if (reviewToastTimeoutRef.current) {
      window.clearTimeout(reviewToastTimeoutRef.current);
    }
    reviewToastTimeoutRef.current = window.setTimeout(() => {
      setReviewToast(null);
      reviewToastTimeoutRef.current = null;
    }, 2600);

    if (reviewSuccessTimeoutRef.current) {
      window.clearTimeout(reviewSuccessTimeoutRef.current);
    }
    reviewSuccessTimeoutRef.current = window.setTimeout(() => {
      closeReviewModal();
      reviewSuccessTimeoutRef.current = null;
    }, 520);
  }

  return (
    <section className="map-screen diesel-map-screen" aria-label="Full screen map view">
      <DiscoveryMap
        cafes={mappableCafes}
        activeCafeId={activeCafe?.id ?? null}
        onSelectCafe={(cafeId) => selectCafe(cafeId, { explicit: true, source: "map_marker" })}
        panToActiveCafeToken={panToActiveCafeToken}
        fallbackPlaces={fallbackPlaces}
        activeFallbackPlaceId={activeFallbackPlace?.id ?? null}
        onSelectFallbackPlace={(placeId) =>
          selectFallbackPlace(placeId, { pan: true, source: "map_marker" })
        }
        panToFallbackPlaceToken={panToFallbackPlaceToken}
        userLocation={userLocation}
        selectedRadiusKm={selectedRadiusKm}
        locateRequestToken={locateRequestToken}
        autoLocateOnMount={false}
        onUserLocation={setUserLocation}
        onLocationStateChange={setLocationState}
      />

      <div className="map-screen-overlay diesel-overlay">
        {reviewToast ? (
          <div className="review-toast fade-slide-in" role="status" aria-live="polite">
            <strong>Review submitted</strong>
            <span>{reviewToast}</span>
          </div>
        ) : null}

        <div className="diesel-topbar fade-slide-in">
          <div className="diesel-topbar-actions diesel-action-cluster" aria-label="Map actions">
            <button
              className="diesel-action-icon control-chip"
              aria-label={canRetryLocation ? "Retry location access" : "Center on my location"}
              type="button"
              onClick={() => requestLocation("toolbar")}
              title={canRetryLocation ? "Retry location" : "Use my location"}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 21s6-4.35 6-10a6 6 0 1 0-12 0c0 5.65 6 10 6 10Z" />
                <circle cx="12" cy="11" r="2.5" />
              </svg>
            </button>
            {locationState === "granted" && userLocation ? (
              <div className="map-radius-inline-shell">
                <button
                  className="map-radius-inline-trigger control-chip"
                  type="button"
                  aria-label={`Nearby radius ${selectedRadiusKm} kilometers`}
                  onClick={cycleRadius}
                  title={`Radius ${selectedRadiusKm} km`}
                >
                  <span>{selectedRadiusKm} km</span>
                </button>
              </div>
            ) : null}
            <button
              className={`diesel-action-icon control-chip${isTopPicksOpen && topPickLens !== "for-you" ? " active" : ""}`}
              type="button"
              aria-label="Open top picks"
              onClick={() => openTopPicks("toolbar")}
              title="Top picks"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="m12 3 2.85 5.78 6.38.93-4.61 4.49 1.09 6.35L12 17.56l-5.71 3 1.09-6.35-4.61-4.49 6.38-.93L12 3Z" />
              </svg>
            </button>
              <button
                className={`diesel-action-icon control-chip${isJournalOpen || isJournalEntryOpen ? " active" : ""}`}
                type="button"
                aria-label="Open your taste journal"
                onClick={() => openJournal("toolbar")}
                title="Your taste"
              >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M6 4.5h9.5a2.5 2.5 0 0 1 2.5 2.5v12.5H8.5A2.5 2.5 0 0 0 6 22V4.5Z" />
                <path d="M6 4.5v15a2.5 2.5 0 0 1 2.5-2.5H18" />
                <path d="M10 8h5" />
                <path d="M10 11.5h5" />
              </svg>
            </button>
              <button
                className={`diesel-action-icon control-chip${isProfilerOpen || (isTopPicksOpen && topPickLens === "for-you") ? " active" : ""}`}
                type="button"
                aria-label={activeCoffeeProfile ? "Open your taste" : "Start your taste setup"}
                onClick={() => openTastePanel("toolbar")}
                title={activeCoffeeProfile ? "Your taste" : "Taste setup"}
              >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 8h12v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Z" />
                <path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16" />
                <path d="M7 4h6" />
              </svg>
            </button>
            <button
              className={`diesel-action-icon control-chip${isSearchOpen ? " active" : ""}`}
              type="button"
              aria-label="Search coffee shops"
              onClick={() => openSearch("toolbar")}
              title="Search"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4.5 4.5" />
              </svg>
            </button>
          </div>
        </div>

        {shouldShowIntro ? (
          <div className="map-intro-shell fade-slide-in">
            <section className="map-intro-card" aria-label="Near Me introduction">
              <div className="map-intro-head">
                <div className="map-intro-kicker">
                  <span>Near Me</span>
                  <strong>Specialty-first coffee discovery</strong>
                </div>
                <button
                  className="map-intro-dismiss"
                  type="button"
                  onClick={dismissIntro}
                  aria-label="Dismiss introduction"
                >
                  Later
                </button>
              </div>

              <div className="map-intro-copy">
                <strong>Find specialty coffee that fits your taste</strong>
                <p>
                  Skip the generic chains. Near Me helps you discover thoughtful coffee spots
                  nearby and learn what kind of coffee you actually enjoy.
                </p>
              </div>

              <div className="map-intro-actions">
                <button
                  className="map-intro-primary control-primary"
                  type="button"
                  onClick={() => {
                    dismissIntro();
                    requestLocation("intro");
                  }}
                  disabled={locationState === "requesting"}
                >
                  {locationState === "requesting"
                    ? "Finding location..."
                    : canRetryLocation
                      ? "Retry location"
                      : "Use my location"}
                </button>
                <button className="map-intro-secondary control-chip" type="button" onClick={() => openTastePanel("intro")}>
                  {activeCoffeeProfile ? "Open my taste" : "Start your taste"}
                </button>
              </div>

              <div className="map-intro-meta">
                <span>Specialty-first picks, not generic chain coffee</span>
                <span>
                  {userLocation
                    ? cafesWithinRadius.length > 0
                      ? `${cafesWithinRadius.length} spots inside ${selectedRadiusKm} km`
                      : `No verified spots inside ${selectedRadiusKm} km yet`
                    : "5 quick questions to unlock taste-aware picks"}
                </span>
              </div>
            </section>
          </div>
        ) : null}

        {isSearchOpen ? (
          <div className="map-search-shell fade-slide-in">
            <section className="map-search-panel" role="dialog" aria-modal="false" aria-label="Search cafes">
              <div className="map-search-input-shell">
                <svg
                  className="map-search-icon"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <circle cx="11" cy="11" r="6.5" />
                  <path d="m16 16 4.5 4.5" />
                </svg>
                <input
                  autoFocus
                  className="map-search-input"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search cafe, city, roaster..."
                />
                <button className="map-search-close" type="button" onClick={closeSearch} aria-label="Close search">
                  Cancel
                </button>
              </div>

              <div className="map-search-results">
                {searchResults.length > 0 ? (
                  searchResults.slice(0, 8).map((cafe) => {
                    const cafeDistance = userLocation ? cafeDistances.get(cafe.id) ?? null : null;
                    const cafeRating =
                      cafe.reviewSummary.reviewCount > 0 ? cafe.reviewSummary.averageRating.toFixed(1) : "New";
                    const searchJournalMatch = journalMatchByCafeId.get(cafe.id) ?? null;

                    return (
                      <button
                        key={cafe.id}
                        className="map-search-result-row"
                        type="button"
                        onClick={() => {
                          selectCafe(cafe.id, {
                            explicit: true,
                            pan: true,
                            nextSheetState: "collapsed",
                            source: "search",
                          });
                          closeSearch();
                        }}
                      >
                        <div className="map-search-result-copy">
                          <strong>{cafe.name}</strong>
                          <span>
                            {[cafe.city, cafeDistance ? formatDistance(cafeDistance) : null, cafe.tags[0] ?? null]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                          {searchJournalMatch ? (
                            <span className="map-search-result-journal-fit">
                              For your journal · {searchJournalMatch.reason}
                            </span>
                          ) : null}
                        </div>
                        <div className="map-search-result-score">
                          <strong>{cafeRating}</strong>
                          <span>{cafe.reviewSummary.reviewCount} reviews</span>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="map-search-empty">
                    <strong>No cafes found</strong>
                    <span>Try a different cafe name, city, or roaster.</span>
                  </div>
                )}
              </div>

              <button
                className="map-search-add-shop"
                type="button"
                onClick={() => openAddShopModal({ name: searchQuery.trim() }, "search")}
              >
                Can&apos;t find it? Add a shop
              </button>
            </section>
          </div>
        ) : null}

        {isTopPicksOpen ? (
          <div className="map-top-picks-shell fade-slide-in">
            <section className="map-top-picks-panel" role="dialog" aria-modal="false" aria-label="Top picks">
              <div className="map-top-picks-head">
                <div className="map-top-picks-title">
                  <strong>{topPickCopy.title}</strong>
                  <span>{topPickCopy.subtitle}</span>
                </div>
                <div className="map-top-picks-head-actions">
                  <button className="map-top-picks-profile-button" type="button" onClick={() => openProfiler("top_picks")}>
                    {activeCoffeeProfile ? "Retune taste" : "Taste setup"}
                  </button>
                  <button className="map-search-close" type="button" onClick={closeTopPicks} aria-label="Close top picks">
                    Close
                  </button>
                </div>
              </div>

              {activeCoffeeProfile ? <CoffeeProfileCard onRetake={() => openProfiler("top_picks")} /> : null}
              {!activeCoffeeProfile && journalDiscoveryCue ? (
                <div className="map-top-picks-journal-cue">
                  <span>Using your journal</span>
                  <strong>{journalDiscoveryCue.replace(/^Using your journal:\s*/i, "")}</strong>
                </div>
              ) : null}

              <div className="map-top-picks-switcher" role="tablist" aria-label="Top pick lenses">
                <button
                  className={`map-top-picks-pill${topPickLens === "nearby" ? " active" : ""}`}
                  type="button"
                  onClick={() => setTopPickLens("nearby")}
                >
                  Nearby
                </button>
                <button
                  className={`map-top-picks-pill${topPickLens === "worth-it" ? " active" : ""}`}
                  type="button"
                  onClick={() => setTopPickLens("worth-it")}
                >
                  Worth it
                </button>
                <button
                  className={`map-top-picks-pill${topPickLens === "work" ? " active" : ""}`}
                  type="button"
                  onClick={() => setTopPickLens("work")}
                >
                  Work
                </button>
                <button
                  className={`map-top-picks-pill${topPickLens === "for-you" ? " active" : ""}`}
                  type="button"
                  onClick={() => setTopPickLens("for-you")}
                >
                  For you
                </button>
              </div>

              <div className="map-top-picks-results">
                {topPickLens === "for-you" && !activeCoffeeProfile && journalEntries.length === 0 ? (
                  <div className="map-top-picks-empty">
                    <strong>Unlock taste-aware picks</strong>
                    <span>Answer 5 fast questions and Near Me will learn the kind of specialty coffee you actually enjoy.</span>
                    <button className="map-top-picks-cta" type="button" onClick={() => openProfiler("top_picks")}>
                      Start taste setup
                    </button>
                  </div>
                ) : activeTopPicks.length > 0 ? activeTopPicks.map((cafe, index) => {
                  const cafeDistance = userLocation ? cafeDistances.get(cafe.id) ?? null : null;
                  const cafeRating =
                    cafe.reviewSummary.reviewCount > 0 ? cafe.reviewSummary.averageRating.toFixed(1) : "New";
                  const profileMatch = activeCoffeeProfile
                    ? getCafeProfileMatch(cafe, activeCoffeeProfile, coffeeProfileState)
                    : null;
                  const journalMatch = journalMatchByCafeId.get(cafe.id) ?? null;

                  return (
                    <button
                      key={cafe.id}
                      className="map-top-pick-row"
                      type="button"
                      onClick={() => {
                        selectCafe(cafe.id, {
                          explicit: true,
                          pan: true,
                          nextSheetState: "collapsed",
                          source: "top_picks",
                        });
                        closeTopPicks();
                      }}
                    >
                      <div className="map-top-pick-rank">{index + 1}</div>
                      <div className="map-top-pick-copy">
                        <strong>{cafe.name}</strong>
                        <span>
                          {[cafe.city, cafeDistance ? formatDistance(cafeDistance) : null, cafe.tags[0] ?? null]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                        {topPickLens === "for-you" && profileMatch ? (
                          <span className="map-top-pick-match">
                            {profileMatch.label} for your taste · {profileMatch.percentage}%
                          </span>
                        ) : journalMatch && (topPickLens === "for-you" || journalMatch.score >= 2.4) ? (
                          <span className="map-top-pick-match">
                            {topPickLens === "for-you" ? journalMatch.label : "Journal fit"} · {journalMatch.reason}
                            {journalMatch.support ? ` · ${journalMatch.support}` : ""}
                          </span>
                        ) : null}
                      </div>
                      <div className="map-top-pick-score">
                        <strong>{cafeRating}</strong>
                        <span>{cafe.reviewSummary.reviewCount} reviews</span>
                      </div>
                    </button>
                  );
                }) : (
                  <div className="map-top-picks-empty">
                    <strong>No matching cafes yet</strong>
                    <span>Try another lens or retune your taste once you explore a bit more.</span>
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : null}

        {isJournalOpen ? (
          <CoffeeJournalPanel
            onClose={closeJournal}
            onLogCurrent={
              activeCafe
                ? () => openJournalEntryModal({ type: "cafe", cafe: activeCafe }, "active_card")
                : undefined
            }
            currentCafeName={activeCafe?.name ?? null}
          />
        ) : null}

        {isProfilerOpen ? (
          <div className="profiler-backdrop fade-slide-in" onClick={closeProfiler}>
            <section
              className="profiler-sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby="profiler-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="profiler-head">
                <div className="profiler-title-group">
                  <span>{`Question ${profilerQuestionIndex + 1} of ${coffeeProfilerQuestions.length}`}</span>
                  <h2 id="profiler-title">Your Taste Setup</h2>
                </div>
                <button className="map-search-close" type="button" onClick={closeProfiler} aria-label="Close taste setup">
                  Close
                </button>
              </div>

              <div className="profiler-progress-track">
                <div
                  className="profiler-progress-fill"
                  style={{ width: `${((profilerQuestionIndex + 1) / coffeeProfilerQuestions.length) * 100}%` }}
                />
              </div>

              <div className="profiler-question-block">
                <strong>{coffeeProfilerQuestions[profilerQuestionIndex]?.question}</strong>
                <span>
                  {coffeeProfilerQuestions[profilerQuestionIndex]?.type === "multi"
                    ? "Choose two that feel most like you."
                    : "Pick the option that feels most natural."}
                </span>
              </div>

              <div className="profiler-options">
                {coffeeProfilerQuestions[profilerQuestionIndex]?.options.map((option, optionIndex) => {
                  const isSelected = profilerSelections.includes(optionIndex);
                  const isMulti = coffeeProfilerQuestions[profilerQuestionIndex]?.type === "multi";

                  return (
                    <button
                      key={option.text}
                      className={`profiler-option${isSelected ? " active" : ""}`}
                      type="button"
                      onClick={() =>
                        isMulti
                          ? handleProfilerMultiChoice(optionIndex)
                          : handleProfilerSingleChoice(optionIndex)
                      }
                    >
                      {option.text}
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        ) : null}

        {isAddShopOpen ? (
          <div className="profiler-backdrop fade-slide-in" onClick={closeAddShopModal}>
            <section
              className="profiler-sheet add-shop-sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-shop-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="profiler-head">
                <div className="profiler-title-group">
                  <span>Help grow Near Me</span>
                  <h2 id="add-shop-title">Add a shop</h2>
                </div>
                <button className="map-search-close" type="button" onClick={closeAddShopModal} aria-label="Close add shop">
                  Close
                </button>
              </div>

              <div className="profiler-question-block">
                <strong>Tell us about the cafe you found</strong>
                <span>Send it straight to Near Me for review and we will add it to the queue.</span>
              </div>

              <label className="review-modal-section">
                <strong>Cafe name</strong>
                <input
                  className="add-shop-input"
                  type="text"
                  value={addShopName}
                  onChange={(event) => setAddShopName(event.target.value)}
                  placeholder="Coffee shop name"
                />
              </label>

              <label className="review-modal-section">
                <strong>Area or address</strong>
                <input
                  className="add-shop-input"
                  type="text"
                  value={addShopArea}
                  onChange={(event) => setAddShopArea(event.target.value)}
                  placeholder="Town, suburb, or street address"
                />
              </label>

              <label className="review-modal-section">
                <strong>Why it belongs on Near Me</strong>
                <textarea
                  className="review-note-input"
                  value={addShopNote}
                  onChange={(event) => setAddShopNote(event.target.value)}
                  placeholder="Specialty coffee, great espresso, local favorite, beautiful space..."
                  rows={4}
                />
              </label>

              {addShopMessage ? (
                <p className={`review-feedback review-feedback-${addShopState}`}>{addShopMessage}</p>
              ) : null}

              <div className="review-modal-actions">
                <button className="review-secondary" type="button" onClick={closeAddShopModal}>
                  Cancel
                </button>
                <button
                  className="review-primary"
                  type="button"
                  onClick={handleAddShopSubmit}
                  disabled={addShopState === "submitting"}
                >
                  {addShopState === "submitting" ? "Submitting..." : "Submit to Near Me"}
                </button>
              </div>
            </section>
          </div>
        ) : null}

        {journalTarget && isJournalEntryOpen ? (
          <div className="profiler-backdrop fade-slide-in" onClick={closeJournalEntryModal}>
            <section
              className="profiler-sheet add-shop-sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby="journal-entry-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="profiler-head">
                <div className="profiler-title-group">
                  <span>Private coffee memory</span>
                  <h2 id="journal-entry-title">Log this visit</h2>
                </div>
                <button className="map-search-close" type="button" onClick={closeJournalEntryModal} aria-label="Close journal entry">
                  Close
                </button>
              </div>

                <div className="profiler-question-block">
                  <strong>
                    {journalTarget.type === "cafe" ? journalTarget.cafe.name : journalTarget.place.name}
                  </strong>
                  <span>
                  This stays private to you. Use it to remember what you drank and quietly sharpen your taste memory.
                  </span>
                </div>

              <label className="review-modal-section">
                <strong>How did it land?</strong>
                <div className="review-score-slider-shell">
                  <div className="review-score-slider-value" aria-live="polite">
                    <span>Your score</span>
                    <strong>{journalRating}</strong>
                  </div>
                  <input
                    className="review-score-slider"
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={journalRating}
                    onChange={(event) => setJournalRating(Number(event.target.value))}
                    aria-label="Journal score from 1 to 10"
                  />
                  <div className="review-score-slider-scale" aria-hidden="true">
                    <span>1</span>
                    <span>5</span>
                    <span>10</span>
                  </div>
                </div>
              </label>

              <div className="review-modal-section">
                <strong>What did you drink?</strong>
                <div className="review-drink-grid">
                  {reviewDrinkOptions.map((option) => {
                    const isSelected = journalDrink === option.label;
                    return (
                      <button
                        key={option.label}
                        className={`review-drink-option${isSelected ? " active" : ""}`}
                        type="button"
                        onClick={() => setJournalDrink(option.label)}
                      >
                        <span>{option.label}</span>
                        <small>{option.examples}</small>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="review-modal-section">
                <strong>How would you describe it?</strong>
                <div className="review-tag-grid">
                  {journalTags.map((tag) => {
                    const isSelected = selectedJournalTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        className={`review-tag-chip${isSelected ? " active" : ""}`}
                        type="button"
                        onClick={() => toggleJournalTag(tag)}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
                <p className="journal-tag-hint">{activeJournalHint}</p>
              </div>

              <label className="review-modal-section">
                <strong>What stood out?</strong>
                <textarea
                  className="review-note-input"
                  value={journalNote}
                  onChange={(event) => setJournalNote(event.target.value)}
                  placeholder="Creamy cortado, brighter than expected, great texture, maybe a little too dark..."
                  rows={4}
                />
              </label>

              {journalMessage ? (
                <p className={`review-feedback review-feedback-${journalState}`}>{journalMessage}</p>
              ) : null}

              <div className="review-modal-actions">
                <button className="review-secondary" type="button" onClick={closeJournalEntryModal}>
                  Cancel
                </button>
                <button className="review-primary" type="button" onClick={handleJournalSubmit}>
                  Save to journal
                </button>
              </div>
            </section>
          </div>
        ) : null}

        {(activeFallbackPlace || hasNoRadiusMatches || (activeCafe && isCafeCardVisible) || shouldShowTodayCup) ? (
          <>
            <section
              className={`diesel-selection-card diesel-selection-card-${sheetState === "expanded" ? "half" : "collapsed"}${isOverlayOpen ? " search-muted" : ""} fade-slide-in`}
              aria-live="polite"
            >
              <button
                className="diesel-sheet-handle"
                type="button"
                onClick={() =>
                  setSheetState((current) => {
                    const nextState = current === "collapsed" ? "expanded" : "collapsed";
                    if (nextState === "expanded") {
                      trackEvent("card_expanded", {
                        has_cafe: Boolean(activeCafe),
                        has_fallback: Boolean(activeFallbackPlace),
                      });
                    }
                    return nextState;
                  })
                }
                aria-label={`Expand cafe sheet, currently ${sheetState}`}
              >
                <span className="diesel-sheet-handle-bar" />
              </button>

              {hasNoRadiusMatches ? (
                <>
                  <div className="diesel-selection-copy diesel-empty-state-copy">
                    <strong>{emptyStateTitle}</strong>
                    <p>{emptyStateBody}</p>
                  </div>

                  {activeFallbackPlace ? (
                    <div className="diesel-fallback-feature">
                      <div className="diesel-fallback-kicker">
                        <span>Nearby option</span>
                        <strong>Not yet verified by Near Me</strong>
                      </div>
                      <div className="diesel-fallback-feature-copy">
                        <strong>{activeFallbackPlace.name}</strong>
                        <p>
                          {[
                            activeFallbackPlace.city,
                            formatDistance(activeFallbackPlace.distanceKm),
                            activeFallbackPlace.category,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <div className="diesel-selection-trust diesel-selection-trust-fallback">
                        <div className="diesel-selection-trust-head">
                          <span>Trust loop</span>
                          <strong>{activeFallbackPlace.trust?.stageLabel ?? "Early local signal"}</strong>
                        </div>
                        <div className="diesel-selection-trust-rule">
                          <strong>{activeFallbackPlace.trust?.progressLabel ?? "0/4 trust signals collected"}</strong>
                          <span>{activeFallbackPlace.trust?.ruleLabel ?? NEAR_ME_CANDIDATE_RULE_LABEL}</span>
                        </div>
                        {activeFallbackPlace.trust ? (
                          <>
                            <div className="diesel-selection-trust-grid">
                              <div className="diesel-selection-trust-block">
                                <span>Reviews in</span>
                                <strong>
                                  {activeFallbackPlace.trust.reviewCount}
                                  {activeFallbackPlace.trust.averageRating
                                    ? ` · ${activeFallbackPlace.trust.averageRating.toFixed(1)}`
                                    : ""}
                                </strong>
                              </div>
                              <div className="diesel-selection-trust-block">
                                <span>Local supporters</span>
                                <strong>{activeFallbackPlace.trust.supporterCount}</strong>
                              </div>
                            </div>
                            {activeFallbackPlace.trust.topTags.length > 0 ? (
                              <div className="diesel-selection-tags">
                                {activeFallbackPlace.trust.topTags.map((tag) => (
                                  <span className="diesel-selection-tag" key={tag}>
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                      <div className="diesel-selection-footer">
                        <span>{activeFallbackPlace.address}</span>
                      </div>
                      <div className="diesel-empty-state-actions">
                      <a
                        className="diesel-selection-primary control-primary"
                        href={`https://www.google.com/maps/search/?api=1&query=${activeFallbackPlace.latitude},${activeFallbackPlace.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() =>
                          trackEvent("directions_clicked", {
                            source: "empty_state",
                            place_name: activeFallbackPlace.name,
                          })
                        }
                      >
                        Directions
                      </a>
                        <button
                          className="diesel-selection-secondary control-chip"
                          type="button"
                          onClick={() => openReviewModal({ type: "fallback", place: activeFallbackPlace }, "empty_state")}
                        >
                          {getFallbackTrustSummary(activeFallbackPlace).cta}
                        </button>
                        <button
                          className="diesel-selection-secondary control-chip"
                          type="button"
                          onClick={() =>
                            openAddShopModal({
                              name: activeFallbackPlace.name,
                              area: activeFallbackPlace.address,
                              note: `Nearby fallback option from ${activeFallbackPlace.source}. Not yet verified by Near Me.`,
                            }, "empty_state")
                          }
                        >
                          Add this shop
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {fallbackState === "loading" ? (
                    <div className="diesel-empty-state-nearest">
                      <span>Checking nearby options</span>
                    </div>
                  ) : null}

                  {fallbackPlaces.length > 0 ? (
                    <div className="diesel-empty-state-nearest">
                      <span>Nearby options</span>
                      <div className="diesel-empty-state-list">
                        {fallbackPlaces.map((place) => {
                          const isActiveFallback = place.id === activeFallbackPlace?.id;

                          return (
                            <button
                              key={place.id}
                              className={`diesel-empty-state-row${isActiveFallback ? " active" : ""}`}
                              type="button"
                              onClick={() => selectFallbackPlace(place.id, { pan: true, source: "empty_state" })}
                            >
                              <div className="diesel-empty-state-row-copy">
                                <strong>{place.name}</strong>
                                <span>
                                  {[
                                    place.city,
                                    formatDistance(place.distanceKm),
                                    place.trust?.reviewCount
                                      ? `${place.trust.reviewCount} review${place.trust.reviewCount === 1 ? "" : "s"}`
                                      : place.category,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </span>
                              </div>
                              <span className="diesel-empty-state-row-score">
                                {formatDistance(place.distanceKm)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  <div className="diesel-empty-state-actions">
                    {nextRadiusKm ? (
                      <button
                        className="diesel-selection-primary control-primary"
                        type="button"
                        onClick={() => {
                          trackEvent("radius_changed", {
                            from_km: selectedRadiusKm,
                            to_km: nextRadiusKm,
                            source: "empty_state",
                          });
                          setSelectedRadiusKm(nextRadiusKm);
                        }}
                      >
                        Expand to {nextRadiusKm} km
                      </button>
                    ) : null}
                    <button
                      className="diesel-selection-secondary control-chip"
                      type="button"
                        onClick={() => openSearch("empty_state")}
                    >
                      Search this area
                    </button>
                    <button
                      className="diesel-selection-secondary control-chip"
                      type="button"
                      onClick={() => openAddShopModal(undefined, "empty_state")}
                    >
                      Add a shop
                    </button>
                  </div>
                </>
              ) : activeFallbackPlace ? (
                <>
                  <div className="diesel-selection-copy diesel-empty-state-copy">
                    <strong>{getFallbackTrustSummary(activeFallbackPlace).title}</strong>
                    <p>{getFallbackTrustSummary(activeFallbackPlace).body}</p>
                  </div>

                  <div className="diesel-fallback-feature">
                    <div className="diesel-fallback-kicker">
                      <span>Prospective shop</span>
                      <strong>{activeFallbackPlace.category}</strong>
                    </div>
                    <div className="diesel-fallback-feature-copy">
                      <strong>{activeFallbackPlace.name}</strong>
                      <p>
                        {[
                          activeFallbackPlace.city,
                          formatDistance(activeFallbackPlace.distanceKm),
                          activeFallbackPlace.category,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <div className="diesel-selection-trust diesel-selection-trust-fallback">
                      <div className="diesel-selection-trust-head">
                        <span>Trust loop</span>
                        <strong>{activeFallbackPlace.trust?.stageLabel ?? "Early local signal"}</strong>
                      </div>
                      <div className="diesel-selection-trust-rule">
                        <strong>{activeFallbackPlace.trust?.progressLabel ?? "0/4 trust signals collected"}</strong>
                        <span>{activeFallbackPlace.trust?.ruleLabel ?? NEAR_ME_CANDIDATE_RULE_LABEL}</span>
                      </div>
                      {activeFallbackPlace.trust ? (
                        <>
                          <div className="diesel-selection-trust-grid">
                            <div className="diesel-selection-trust-block">
                              <span>Reviews in</span>
                              <strong>
                                {activeFallbackPlace.trust.reviewCount}
                                {activeFallbackPlace.trust.averageRating
                                  ? ` · ${activeFallbackPlace.trust.averageRating.toFixed(1)}`
                                  : ""}
                              </strong>
                            </div>
                            <div className="diesel-selection-trust-block">
                              <span>Local supporters</span>
                              <strong>{activeFallbackPlace.trust.supporterCount}</strong>
                            </div>
                          </div>
                          {activeFallbackPlace.trust.latestNote ? (
                            <p className="diesel-selection-trust-quote">“{activeFallbackPlace.trust.latestNote}”</p>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                    <div className="diesel-selection-footer">
                      <span>{activeFallbackPlace.address}</span>
                    </div>
                    <div className="diesel-empty-state-actions">
                      <a
                        className="diesel-selection-primary control-primary"
                        href={`https://www.google.com/maps/search/?api=1&query=${activeFallbackPlace.latitude},${activeFallbackPlace.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() =>
                          trackEvent("directions_clicked", {
                            source: "fallback_card",
                            place_name: activeFallbackPlace.name,
                          })
                        }
                      >
                        Directions
                      </a>
                      <button
                        className="diesel-selection-secondary control-chip"
                        type="button"
                        onClick={() => openReviewModal({ type: "fallback", place: activeFallbackPlace }, "fallback_card")}
                      >
                        {getFallbackTrustSummary(activeFallbackPlace).cta}
                      </button>
                      <button
                        className="diesel-selection-secondary control-chip"
                        type="button"
                        onClick={() =>
                          openAddShopModal({
                            name: activeFallbackPlace.name,
                            area: activeFallbackPlace.address,
                            note: `Nearby fallback option from ${activeFallbackPlace.source}. Not yet verified by Near Me.`,
                          }, "fallback_card")
                        }
                      >
                        Add this shop
                      </button>
                    </div>
                  </div>
                </>
              ) : activeCafe && isCafeCardVisible ? (
                <>
                  <div className="diesel-selection-head">
                    <div className="diesel-selection-meta">
                      <span>{activeCafe.city}</span>
                      <span>{activeDistance ? formatDistance(activeDistance) : activeCafe.countryCode}</span>
                    </div>
                    <div className="diesel-selection-head-actions">
                      <div className="diesel-selection-score">
                        <strong>{activeRating ?? "New"}</strong>
                        <span>
                          {activeCafe.reviewSummary.reviewCount > 0
                            ? `${activeCafe.reviewSummary.reviewCount} reviews`
                            : "No reviews yet"}
                        </span>
                      </div>
                      {todayCupPrimary ? (
                        <button
                          className="diesel-selection-context-chip"
                          type="button"
                          onClick={() => {
                            hasExplicitCafeSelectionRef.current = false;
                            setIsCafeCardVisible(false);
                            setSheetState("collapsed");
                          }}
                        >
                          Today&apos;s cup
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="diesel-selection-copy">
                    <strong>{activeCafe.name}</strong>
                    {activeDecisionGuide ? (
                      <div className="diesel-selection-decision-badge">
                        <span className="diesel-selection-decision-kicker">Go if</span>
                        <strong>{activeDecisionGuide.goIfHeadline}</strong>
                      </div>
                    ) : null}
                    {isCollapsedCard && (activeProfileMatch || activeJournalMatch) ? (
                      <div className="diesel-selection-match-nudge">
                        <span className="diesel-selection-match-nudge-value">
                          {activeProfileMatch
                            ? `${activeProfileMatch.percentage}% taste match`
                            : activeJournalMatch?.label ?? "Journal fit"}
                        </span>
                        <span className="diesel-selection-match-nudge-copy">
                          {activeProfileMatch
                            ? activeProfileMatch.label
                            : activeJournalMatch?.reason ?? "Near Me is learning from your journal"}
                        </span>
                      </div>
                    ) : null}
                    <p>
                      {isCollapsedCard
                        ? activeDecisionGuide?.goIfSupport ?? activeDecisionGuide?.trustSummary ?? activeCafe.summary
                        : activeDecisionGuide?.bestForDetail ?? activeDecisionGuide?.goIfSupport ?? activeDecisionGuide?.trustSummary ?? activeCafe.summary}
                    </p>
                  </div>

                  {activeDecisionGuide && !isCollapsedCard ? (
                    <div className="diesel-selection-quick-grid">
                      <div className="diesel-selection-quick-card">
                        <span>Best for</span>
                        <strong>{activeDecisionGuide.bestFor}</strong>
                      </div>
                      <div className="diesel-selection-quick-card">
                        <span>Order first</span>
                        <strong>{activeDecisionGuide.order}</strong>
                      </div>
                    </div>
                  ) : null}

                  {!isCollapsedCard && (activeCoffeeProfile || activeJournalMatch || activeDecisionGuide || activeTrustMentions.length > 0 || activeTrustQuote) ? (
                    <div className="diesel-selection-trust">
                      {activeCoffeeProfile ? <ProfileMatchPill cafe={activeCafe} variant="card" /> : null}
                      {activeJournalMatch ? (
                        <div className="diesel-selection-trust-head diesel-selection-trust-head-journal">
                          <span>Based on your journal</span>
                          <strong>{activeJournalMatch.reason}</strong>
                          <small>{activeJournalMatch.support ?? activeJournalMatch.label}</small>
                        </div>
                      ) : null}
                      {activeTrustMentions.length > 0 ? (
                        <div className="diesel-selection-trust-head">
                          <span>People mention</span>
                          <strong>{activeTrustMentions.join(" + ")}</strong>
                        </div>
                      ) : null}
                      {activeTrustQuote ? (
                        <p className="diesel-selection-trust-quote">“{activeTrustQuote}”</p>
                      ) : null}
                      {activeDecisionGuide?.trustBullets.length ? (
                        <div className="diesel-selection-trust-list">
                          <span className="diesel-selection-trust-confidence">
                            {activeDecisionGuide.confidenceRead}
                          </span>
                          {activeDecisionGuide.trustBullets.slice(0, 2).map((bullet) => (
                            <span key={bullet}>{bullet}</span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {activeTags.length > 0 ? (
                    <div className="diesel-selection-tags">
                      {activeTags.map((tag) => (
                        <span key={tag} className="diesel-selection-tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {isExpandedCard && activeJournalMemory ? (
                    <div className="diesel-selection-journal-memory">
                      <div className="diesel-selection-journal-memory-head">
                        <span>Logged before</span>
                        <strong>
                          {activeJournalMemory.visitCount} visit{activeJournalMemory.visitCount === 1 ? "" : "s"}
                        </strong>
                      </div>
                      <p>
                        {activeJournalMemory.lastDrink
                          ? `Last time you had a ${activeJournalMemory.lastDrink.toLowerCase()} here`
                          : "You have logged this place before."}
                        {activeJournalMemory.averageRating
                          ? ` and scored it ${activeJournalMemory.averageRating}/10.`
                          : "."}
                      </p>
                      {activeJournalMemory.topTags.length > 0 ? (
                        <div className="diesel-selection-tags">
                          {activeJournalMemory.topTags.slice(0, 2).map((tag) => (
                            <span key={tag} className="diesel-selection-tag">
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {isExpandedCard ? (
                    <div className="diesel-selection-footer">
                      <span>{activeCafe.address}</span>
                    </div>
                  ) : null}

                  <div className="diesel-selection-actions">
                    <div className="diesel-selection-actions-main">
                      {directionsHref ? (
                        <a
                          className="diesel-selection-primary diesel-selection-primary-main control-primary"
                          href={directionsHref}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() =>
                            trackEvent("directions_clicked", {
                              source: "active_card",
                              cafe_slug: activeCafe.slug,
                            })
                          }
                        >
                          Directions
                        </a>
                      ) : null}
                      <Link
                        className="diesel-selection-secondary diesel-selection-secondary-main control-chip"
                        href={`/cafes/${activeCafe.slug}`}
                        onClick={() =>
                          trackEvent("details_opened", {
                            source: "active_card",
                            cafe_slug: activeCafe.slug,
                          })
                        }
                      >
                        Details
                      </Link>
                      <div className="diesel-selection-actions-icons">
                        <button
                          className={`diesel-selection-icon-button${isActiveCafeSaved ? " active" : ""}`}
                          type="button"
                          onClick={() => toggleFavoriteCafe(activeCafe.id)}
                          aria-label={isActiveCafeSaved ? "Remove from saved cafes" : "Save cafe"}
                        >
                          <span aria-hidden="true">{isActiveCafeSaved ? "♥" : "♡"}</span>
                        </button>
                        <button
                          className="diesel-selection-icon-button"
                          type="button"
                          onClick={() => openReviewModal({ type: "cafe", cafe: activeCafe }, "active_card")}
                          aria-label="Leave a review"
                        >
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
                          </svg>
                        </button>
                        <button
                          className="diesel-selection-icon-button"
                          type="button"
                          onClick={() => openJournalEntryModal({ type: "cafe", cafe: activeCafe }, "active_card")}
                          aria-label="Log this visit privately"
                        >
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M6 4.5h9.5a2.5 2.5 0 0 1 2.5 2.5v12.5H8.5A2.5 2.5 0 0 0 6 22V4.5Z" />
                            <path d="M6 4.5v15a2.5 2.5 0 0 1 2.5-2.5H18" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : todayCupPrimary ? (
                <>
                  <div className="diesel-selection-head diesel-selection-head-today">
                    <div className="diesel-selection-meta">
                      <span>Today&apos;s cup</span>
                      <span>{todayCupMoment.shortLabel}</span>
                    </div>
                    <div className="diesel-selection-score diesel-selection-score-today">
                      <strong>{formatDistance(todayCupPrimary.distance)}</strong>
                      <span>{todayCupPrimary.decisionGuide.confidenceRead}</span>
                    </div>
                  </div>

                  <div className="diesel-selection-copy diesel-selection-copy-today">
                    <strong>{todayCupPrimary.cafe.name}</strong>
                    <div className="diesel-selection-decision-badge diesel-selection-decision-badge-today">
                      <span className="diesel-selection-decision-kicker">Go today if</span>
                      <strong>{todayCupPrimary.decisionGuide.goIfHeadline}</strong>
                    </div>
                    {isCollapsedCard ? (
                      <div className="diesel-selection-match-nudge">
                        <span className="diesel-selection-match-nudge-value">{todayCupMoment.label}</span>
                        <span className="diesel-selection-match-nudge-copy">
                          {todayCupPrimary.journalMatch?.reason ??
                            todayCupPrimary.profileMatch?.label ??
                            todayCupPrimary.decisionGuide.goIfSupport}
                        </span>
                      </div>
                    ) : null}
                    <p>
                      {isCollapsedCard
                        ? todayCupMoment.cue
                        : todayCupPrimary.journalMatch?.support ??
                          todayCupPrimary.profileMatch?.reasons?.[0] ??
                          todayCupPrimary.decisionGuide.goIfSupport}
                    </p>
                  </div>

                  <div className="diesel-today-feedback diesel-today-feedback-inline">
                    <span>Help Near Me learn</span>
                    <div className="diesel-today-feedback-list">
                      {(Object.entries(todayCupFeedbackCopy) as Array<
                        [TodayCupFeedbackReason, (typeof todayCupFeedbackCopy)[TodayCupFeedbackReason]]
                      >).map(([reason, config]) => (
                        <button
                          key={reason}
                          className="diesel-today-feedback-chip"
                          type="button"
                          onClick={() => handleTodayCupFeedback(reason)}
                        >
                          {config.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {!isCollapsedCard ? (
                    <>
                      <div className="diesel-selection-quick-grid">
                        <div className="diesel-selection-quick-card">
                          <span>Order first</span>
                          <strong>{todayCupPrimary.decisionGuide.order}</strong>
                        </div>
                        <div className="diesel-selection-quick-card">
                          <span>Best for</span>
                          <strong>{todayCupPrimary.decisionGuide.bestFor}</strong>
                        </div>
                      </div>

                      {todayCupBackups.length > 0 ? (
                        <div className="diesel-today-backups">
                          <span>Backups</span>
                          <div className="diesel-today-backup-list">
                            {todayCupBackups.map((backup) => (
                              <button
                                key={backup.cafe.id}
                                className="diesel-today-backup-row"
                                type="button"
                                onClick={() =>
                                  selectCafe(backup.cafe.id, {
                                    explicit: true,
                                    pan: true,
                                    nextSheetState: "collapsed",
                                    source: "today_cup",
                                  })
                                }
                              >
                                <div className="diesel-today-backup-copy">
                                  <strong>{backup.cafe.name}</strong>
                                  <span>
                                    {[backup.cafe.city, formatDistance(backup.distance), backup.decisionGuide.order]
                                      .filter(Boolean)
                                      .join(" · ")}
                                  </span>
                                </div>
                                <span className="diesel-today-backup-score">
                                  {backup.profileMatch
                                    ? `${backup.profileMatch.percentage}%`
                                    : backup.journalMatch?.label ?? "Backup"}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : null}

                  <div className="diesel-selection-actions">
                    <div className="diesel-selection-actions-main">
                      <button
                        className="diesel-selection-primary diesel-selection-primary-main control-primary"
                        type="button"
                        onClick={() =>
                          selectCafe(todayCupPrimary.cafe.id, {
                            explicit: true,
                            pan: true,
                            nextSheetState: "expanded",
                            source: "today_cup",
                          })
                        }
                      >
                        Open pick
                      </button>
                      <button
                        className="diesel-selection-secondary diesel-selection-secondary-main control-chip"
                        type="button"
                        onClick={() => openTopPicks("today_cup")}
                      >
                        More picks
                      </button>
                    </div>
                  </div>
                </>
              ) : null}
            </section>
          </>
        ) : null}

        {reviewTarget && isReviewOpen ? (
          <div className="review-modal-backdrop" onClick={closeReviewModal}>
            <section
              className="review-modal-sheet review-modal-sheet-enter"
              role="dialog"
              aria-modal="true"
              aria-labelledby="review-modal-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="cafe-detail-card-top">
                <button className="back-chip cafe-detail-close" type="button" onClick={closeReviewModal}>
                  <span aria-hidden="true">←</span>
                  <span>Back</span>
                </button>
              </div>

              <div className="review-modal-header">
                <span className="review-modal-kicker">
                  {reviewTarget.type === "cafe" ? "Quick review" : "First review"}
                </span>
                <h2 id="review-modal-title">
                  {reviewTarget.type === "cafe"
                    ? `How was ${reviewTarget.cafe.name}?`
                    : `Help us review ${reviewTarget.place.name}`}
                </h2>
                <p>
                  {reviewTarget.type === "cafe"
                    ? "Keep it short and useful. Rate the coffee, pick your drink, and add one clear note."
                    : "This place is not yet verified by Near Me. Your review helps us decide whether it belongs on the map."}
                </p>
              </div>

              <div className="review-modal-section">
                <strong>Score</strong>
                <div className="review-score-slider-shell">
                  <div className="review-score-slider-value" aria-live="polite">
                    <span>Your score</span>
                    <strong>{reviewRating}</strong>
                  </div>
                  <input
                    className="review-score-slider"
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={reviewRating}
                    onChange={(event) => setReviewRating(Number(event.target.value))}
                    aria-label="Coffee score from 1 to 10"
                  />
                  <div className="review-score-slider-scale" aria-hidden="true">
                    <span>1</span>
                    <span>5</span>
                    <span>10</span>
                  </div>
                </div>
              </div>

              <div className="review-modal-section">
                <strong>Drink ordered</strong>
                <div className="review-drink-grid">
                  {reviewDrinkOptions.map((drink) => (
                    <button
                      key={drink.label}
                      className={`review-drink-option${reviewDrink === drink.label ? " active" : ""}`}
                      type="button"
                      onClick={() => setReviewDrink(drink.label)}
                    >
                      <strong>{drink.label}</strong>
                      <span>{drink.examples}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="review-modal-section">
                <strong>What stood out?</strong>
                <span className="review-section-helper">
                  Pick up to three signals that best describe the cup. These help Near Me learn your taste.
                </span>
                <div className="review-chip-row">
                  {reviewTags.map((tag) => (
                    <button
                      key={tag}
                      className={`review-chip${selectedReviewTags.includes(tag) ? " active" : ""}`}
                      type="button"
                      onClick={() => toggleReviewTag(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <label className="review-modal-section">
                <strong>Short note</strong>
                <textarea
                  className="review-note-input"
                  value={reviewNote}
                  onChange={(event) => setReviewNote(event.target.value)}
                  placeholder="Great flat white, calm space, worth the detour."
                  rows={4}
                />
              </label>

              {reviewMessage ? (
                <p className={`review-feedback review-feedback-${reviewState}`}>{reviewMessage}</p>
              ) : null}

              <div className="review-modal-actions">
                <button className="review-secondary" type="button" onClick={closeReviewModal}>
                  Cancel
                </button>
                <button
                  className="review-primary"
                  type="button"
                  onClick={handleReviewSubmit}
                  disabled={reviewState === "submitting" || reviewState === "success"}
                >
                  {reviewState === "submitting" ? "Sending..." : reviewState === "success" ? "Submitted" : "Submit review"}
                </button>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </section>
  );
}
