"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Cafe, CafeReviewSummary, CafeTrustPreview, FallbackPlace } from "@/types/cafe";
import { CoffeeProfileCard } from "@/components/coffee-profile-card";
import { DiscoveryMap } from "@/components/discovery-map";
import { ProfileMatchPill } from "@/components/profile-match-pill";
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
};

type ReviewTarget =
  | { type: "cafe"; cafe: Cafe }
  | { type: "fallback"; place: FallbackPlace };

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
const radiusOptionsKm = [1, 3, 5, 10];

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

export function HomeDiscoveryScreen({ cafes }: HomeDiscoveryScreenProps) {
  const pathname = usePathname();
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
  const [activeCafeId, setActiveCafeId] = useState<string | null>(mappableCafes[0]?.id ?? null);
  const [activeFallbackId, setActiveFallbackId] = useState<string | null>(null);
  const [panToActiveCafeToken, setPanToActiveCafeToken] = useState(0);
  const [panToFallbackPlaceToken, setPanToFallbackPlaceToken] = useState(0);
  const [locateRequestToken, setLocateRequestToken] = useState(0);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedRadiusKm, setSelectedRadiusKm] = useState(1);
  const [locationState, setLocationState] = useState<
    "idle" | "requesting" | "granted" | "denied" | "unavailable"
  >("idle");
  const [sheetState, setSheetState] = useState<"collapsed" | "half" | "full">("collapsed");
  const [isTopPicksOpen, setIsTopPicksOpen] = useState(false);
  const [topPickLens, setTopPickLens] = useState<"nearby" | "worth-it" | "work" | "for-you">("nearby");
  const [isProfilerOpen, setIsProfilerOpen] = useState(false);
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
  const previousRadiusKmRef = useRef(selectedRadiusKm);

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

  const activeCafe =
    mappableCafes.find((cafe) => cafe.id === activeCafeId) ?? mappableCafes[0] ?? hydratedCafes[0] ?? null;
  const activeCoffeeProfile = useMemo(
    () => getCoffeeProfileBySlug(coffeeProfileState?.profileSlug),
    [coffeeProfileState?.profileSlug],
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
      const leftNearbyScore = leftRating + leftPopularityBoost + leftRadiusBonus - leftDistance * 0.22;
      const rightNearbyScore = rightRating + rightPopularityBoost + rightRadiusBonus - rightDistance * 0.22;

      if (Math.abs(rightNearbyScore - leftNearbyScore) > 0.08) {
        return rightNearbyScore - leftNearbyScore;
      }

      if (Math.abs(leftDistance - rightDistance) > 0.12) {
        return leftDistance - rightDistance;
      }

      return rightRating - leftRating;
    });
  }, [cafeDistances, mappableCafes, selectedRadiusKm, userLocation]);
  const rankedCafes = useMemo(() => {
    if (!activeCafe) {
      return cafesByDistance;
    }

    return [activeCafe, ...cafesByDistance.filter((cafe) => cafe.id !== activeCafe.id)];
  }, [activeCafe, cafesByDistance]);
  const locationCopy = useMemo(() => {
    if (locationState === "granted" && userLocation) {
      return {
        caption: "Location on",
        label: "Near Me",
      };
    }

    if (locationState === "requesting") {
      return {
        caption: "Finding",
        label: "Your area",
      };
    }

    if (locationState === "denied") {
      return {
        caption: "Location off",
        label: activeCafe?.city ?? "Search instead",
      };
    }

    if (locationState === "unavailable") {
      return {
        caption: "Location unavailable",
        label: activeCafe?.city ?? "Explore map",
      };
    }

    return {
      caption: "Showing",
      label: activeCafe?.city ?? "Near Me",
    };
  }, [activeCafe?.city, locationState, userLocation]);
  const activeTags = activeCafe?.tags.slice(0, 3) ?? [];
  const activeTrustMentions = activeCafe?.trustPreview.topMentions.slice(0, 2) ?? [];
  const activeTrustQuote = activeCafe?.trustPreview.recentQuote ?? null;
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
  const isOverlayOpen = isSearchOpen || isTopPicksOpen || isProfilerOpen || isAddShopOpen;
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
    const forYou = activeCoffeeProfile
      ? [...mappableCafes]
          .sort((left, right) => {
            const leftDistance = cafeDistances.get(left.id) ?? 999;
            const rightDistance = cafeDistances.get(right.id) ?? 999;
            const leftRadiusBonus = leftDistance <= selectedRadiusKm ? 0.8 : -Math.min(leftDistance - selectedRadiusKm, 8) * 0.08;
            const rightRadiusBonus = rightDistance <= selectedRadiusKm ? 0.8 : -Math.min(rightDistance - selectedRadiusKm, 8) * 0.08;
            const leftScore =
              getCafeProfileMatchScore(left, activeCoffeeProfile, coffeeProfileState) +
              leftRadiusBonus -
              leftDistance * 0.12;
            const rightScore =
              getCafeProfileMatchScore(right, activeCoffeeProfile, coffeeProfileState) +
              rightRadiusBonus -
              rightDistance * 0.12;
            return rightScore - leftScore;
          })
          .slice(0, 6)
      : [];

    return { nearby, worthIt, work, forYou };
  }, [activeCoffeeProfile, cafeDistances, coffeeProfileState, mappableCafes, rankedCafes, selectedRadiusKm]);
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
            title: activeCoffeeProfile ? `For your ${activeCoffeeProfile.shortName} profile` : "Built for your taste",
            subtitle: activeCoffeeProfile
              ? `Recommendations shaped around ${activeCoffeeProfile.recommendedDrinks.join(", ")}`
              : "Take the 5-question Coffee Profiler to unlock taste-aware picks",
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
  const nearestKnownCafes = useMemo(() => {
    if (!userLocation) {
      return cafesByDistance.slice(0, 3);
    }

    return cafesByDistance
      .filter((cafe) => {
        const distance = cafeDistances.get(cafe.id);
        return typeof distance === "number" && distance > selectedRadiusKm;
      })
      .slice(0, 3);
  }, [cafeDistances, cafesByDistance, selectedRadiusKm, userLocation]);
  const nextRadiusKm = radiusOptionsKm.find((radiusKm) => radiusKm > selectedRadiusKm) ?? null;
  const hasNoRadiusMatches = Boolean(userLocation) && cafesWithinRadius.length === 0;
  const activeFallbackPlace =
    fallbackPlaces.find((place) => place.id === activeFallbackId) ??
    (hasNoRadiusMatches ? fallbackPlaces[0] ?? null : null);
  const emptyStateTitle =
    fallbackPlaces.length > 0
      ? `No Near Me picks in ${selectedRadiusKm} km`
      : nearestKnownCafes.length > 0
        ? `No specialty spots in ${selectedRadiusKm} km`
        : "We have not mapped this area yet";
  const emptyStateBody =
    fallbackPlaces.length > 0
      ? "We found a few nearby options, but they are not yet verified by Near Me."
      : nearestKnownCafes.length > 0
        ? "Nothing in the current radius yet, but there are still good options a little farther out."
        : "This area looks empty in our database right now. You can widen the search or help put this town on Near Me.";
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

      const payload = (await response.json()) as { success?: boolean; error?: string };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Could not submit shop.");
      }

      setAddShopState("success");
      setAddShopMessage("Shop sent for review. Thanks for helping grow Near Me.");
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
      nextSheetState?: "collapsed" | "half" | "full";
    },
  ) {
    const explicit = options?.explicit ?? true;

    if (explicit) {
      hasExplicitCafeSelectionRef.current = true;
    }

    setActiveFallbackId(null);
    setActiveCafeId(cafeId);

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
    },
  ) {
    hasExplicitCafeSelectionRef.current = false;
    setActiveCafeId(null);
    setActiveFallbackId(placeId);
    setSheetState("collapsed");

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
    setActiveCafeId((current) => (current === matchedCafe.id ? current : matchedCafe.id));
    setSheetState("half");
    setIsSearchOpen(false);
    setIsTopPicksOpen(false);
    setIsProfilerOpen(false);
  }, [hydratedCafes, mappableCafes, pathname]);

  useEffect(() => {
    if (mappableCafes.length === 0) {
      setActiveCafeId(null);
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

    const suggestedCafe = inRadiusCafe ?? cafesByDistance[0] ?? mappableCafes[0] ?? null;

    if (!suggestedCafe) {
      return;
    }

    setActiveCafeId((current) => (current === suggestedCafe.id ? current : suggestedCafe.id));
  }, [
    activeCafeId,
    cafeDistances,
    cafesByDistance,
    mappableCafes,
    selectedRadiusKm,
    userLocation,
  ]);

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

  function openSearch() {
    setIsTopPicksOpen(false);
    setIsSearchOpen(true);
  }

  function closeSearch() {
    setIsSearchOpen(false);
    setSearchQuery("");
  }

  function openTopPicks() {
    setIsSearchOpen(false);
    setIsTopPicksOpen(true);
  }

  function openTastePanel() {
    if (activeCoffeeProfile) {
      setIsSearchOpen(false);
      setIsTopPicksOpen(true);
      setTopPickLens("for-you");
      return;
    }

    openProfiler();
  }

  function closeTopPicks() {
    setIsTopPicksOpen(false);
  }

  function openAddShopModal(prefill?: { name?: string; area?: string; note?: string }) {
    setIsSearchOpen(false);
    setIsTopPicksOpen(false);
    setIsProfilerOpen(false);
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

  function openProfiler() {
    setIsSearchOpen(false);
    setIsTopPicksOpen(false);
    resetProfiler();
    setIsProfilerOpen(true);
  }

  function closeProfiler() {
    setIsProfilerOpen(false);
  }

  function cycleRadius() {
    const currentIndex = radiusOptionsKm.indexOf(selectedRadiusKm);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % radiusOptionsKm.length;
    setSelectedRadiusKm(radiusOptionsKm[nextIndex]);
  }

  function saveResolvedProfile(nextScores: ReturnType<typeof defaultProfilerScores>) {
    const nextProfileState = createCoffeeProfileState(nextScores, {
      reviewCount: coffeeProfileState?.reviewCount ?? 0,
      source: coffeeProfileState?.reviewCount ? "quiz+reviews" : "quiz",
    });
    setStoredCoffeeProfileState(nextProfileState);
    setReviewToast(`Taste profile updated: ${resolveCoffeeProfile(nextScores).name}`);

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

  function openReviewModal(target?: ReviewTarget) {
    if (reviewSuccessTimeoutRef.current) {
      window.clearTimeout(reviewSuccessTimeoutRef.current);
      reviewSuccessTimeoutRef.current = null;
    }
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
        onSelectCafe={(cafeId) => selectCafe(cafeId, { explicit: true })}
        panToActiveCafeToken={panToActiveCafeToken}
        fallbackPlaces={fallbackPlaces}
        activeFallbackPlaceId={activeFallbackPlace?.id ?? null}
        onSelectFallbackPlace={(placeId) => selectFallbackPlace(placeId, { pan: true })}
        panToFallbackPlaceToken={panToFallbackPlaceToken}
        userLocation={userLocation}
        selectedRadiusKm={selectedRadiusKm}
        locateRequestToken={locateRequestToken}
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
          <button
            className="diesel-location-chip control-chip"
            type="button"
            onClick={canRetryLocation ? () => setLocateRequestToken((value) => value + 1) : undefined}
            aria-label={canRetryLocation ? "Retry location access" : "Current location status"}
            title={canRetryLocation ? "Retry location" : locationCopy.label}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 21s6-4.35 6-10a6 6 0 1 0-12 0c0 5.65 6 10 6 10Z" />
              <circle cx="12" cy="11" r="2.5" />
            </svg>
            <strong>{canRetryLocation ? "Retry location" : locationCopy.label}</strong>
          </button>

          <div className="diesel-topbar-actions diesel-action-cluster" aria-label="Map actions">
            <button
              className="diesel-action-icon control-chip"
              aria-label="Center on my location"
              type="button"
              onClick={() => setLocateRequestToken((value) => value + 1)}
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
              onClick={openTopPicks}
              title="Top picks"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="m12 3 2.85 5.78 6.38.93-4.61 4.49 1.09 6.35L12 17.56l-5.71 3 1.09-6.35-4.61-4.49 6.38-.93L12 3Z" />
              </svg>
            </button>
            <button
              className={`diesel-action-icon control-chip${isProfilerOpen || (isTopPicksOpen && topPickLens === "for-you") ? " active" : ""}`}
              type="button"
              aria-label={activeCoffeeProfile ? "Open your taste profile" : "Open coffee profiler"}
              onClick={openTastePanel}
              title={activeCoffeeProfile ? "Your taste" : "Coffee profiler"}
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
              onClick={openSearch}
              title="Search"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4.5 4.5" />
              </svg>
            </button>
          </div>
        </div>

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
                onClick={() => openAddShopModal({ name: searchQuery.trim() })}
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
                  <button className="map-top-picks-profile-button" type="button" onClick={openProfiler}>
                    {activeCoffeeProfile ? "Retake profile" : "Coffee profiler"}
                  </button>
                  <button className="map-search-close" type="button" onClick={closeTopPicks} aria-label="Close top picks">
                    Close
                  </button>
                </div>
              </div>

              {activeCoffeeProfile ? <CoffeeProfileCard onRetake={openProfiler} /> : null}

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
                {topPickLens === "for-you" && !activeCoffeeProfile ? (
                  <div className="map-top-picks-empty">
                    <strong>Unlock taste-aware picks</strong>
                    <span>Answer 5 fast questions and Near Me will learn the kind of specialty coffee you actually enjoy.</span>
                    <button className="map-top-picks-cta" type="button" onClick={openProfiler}>
                      Start Coffee Profiler
                    </button>
                  </div>
                ) : activeTopPicks.length > 0 ? activeTopPicks.map((cafe, index) => {
                  const cafeDistance = userLocation ? cafeDistances.get(cafe.id) ?? null : null;
                  const cafeRating =
                    cafe.reviewSummary.reviewCount > 0 ? cafe.reviewSummary.averageRating.toFixed(1) : "New";
                  const profileMatch = activeCoffeeProfile
                    ? getCafeProfileMatch(cafe, activeCoffeeProfile, coffeeProfileState)
                    : null;

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
                            {profileMatch.label} for your profile · {profileMatch.percentage}%
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
                    <span>Try another lens or retake the profiler once you explore a bit more.</span>
                  </div>
                )}
              </div>
            </section>
          </div>
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
                  <h2 id="profiler-title">Coffee Profiler</h2>
                </div>
                <button className="map-search-close" type="button" onClick={closeProfiler} aria-label="Close profiler">
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

        {activeCafe || activeFallbackPlace || hasNoRadiusMatches ? (
          <>
            {activeCoffeeProfile && !isOverlayOpen && !activeFallbackPlace && !hasNoRadiusMatches ? (
              <div className="map-profile-floating-card fade-slide-in">
                <CoffeeProfileCard onRetake={openProfiler} variant="floating" />
              </div>
            ) : null}
            <section
              className={`diesel-selection-card diesel-selection-card-${sheetState}${isOverlayOpen ? " search-muted" : ""} fade-slide-in`}
              aria-live="polite"
            >
              <button
                className="diesel-sheet-handle"
                type="button"
                onClick={() =>
                  setSheetState((current) =>
                    current === "collapsed" ? "half" : current === "half" ? "full" : "collapsed",
                  )
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
                      <div className="diesel-selection-footer">
                        <span>{activeFallbackPlace.address}</span>
                      </div>
                      <div className="diesel-empty-state-actions">
                        <a
                          className="diesel-selection-primary control-primary"
                          href={`https://www.google.com/maps/search/?api=1&query=${activeFallbackPlace.latitude},${activeFallbackPlace.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Directions
                        </a>
                        <button
                          className="diesel-selection-secondary control-chip"
                          type="button"
                          onClick={() => openReviewModal({ type: "fallback", place: activeFallbackPlace })}
                        >
                          Be first to review
                        </button>
                        <button
                          className="diesel-selection-secondary control-chip"
                          type="button"
                          onClick={() =>
                            openAddShopModal({
                              name: activeFallbackPlace.name,
                              area: activeFallbackPlace.address,
                              note: `Nearby fallback option from ${activeFallbackPlace.source}. Not yet verified by Near Me.`,
                            })
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
                              onClick={() => selectFallbackPlace(place.id, { pan: true })}
                            >
                              <div className="diesel-empty-state-row-copy">
                                <strong>{place.name}</strong>
                                <span>{[place.city, formatDistance(place.distanceKm), place.category].filter(Boolean).join(" · ")}</span>
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

                  {!activeFallbackPlace && fallbackState !== "loading" && nearestKnownCafes.length > 0 ? (
                    <div className="diesel-empty-state-nearest">
                      <span>Closest Near Me picks</span>
                      <div className="diesel-empty-state-list">
                        {nearestKnownCafes.map((cafe) => {
                          const cafeDistance = cafeDistances.get(cafe.id);

                          return (
                            <button
                              key={cafe.id}
                              className="diesel-empty-state-row"
                              type="button"
                              onClick={() =>
                                selectCafe(cafe.id, {
                                  explicit: true,
                                  pan: true,
                                  nextSheetState: "collapsed",
                                })
                              }
                            >
                              <div className="diesel-empty-state-row-copy">
                                <strong>{cafe.name}</strong>
                                <span>{[cafe.city, cafeDistance ? formatDistance(cafeDistance) : null].filter(Boolean).join(" · ")}</span>
                              </div>
                              <span className="diesel-empty-state-row-score">
                                {cafe.reviewSummary.reviewCount > 0
                                  ? cafe.reviewSummary.averageRating.toFixed(1)
                                  : "New"}
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
                        onClick={() => setSelectedRadiusKm(nextRadiusKm)}
                      >
                        Expand to {nextRadiusKm} km
                      </button>
                    ) : null}
                    <button
                      className="diesel-selection-secondary control-chip"
                      type="button"
                      onClick={openSearch}
                    >
                      Search this area
                    </button>
                    <button
                      className="diesel-selection-secondary control-chip"
                      type="button"
                      onClick={() => openAddShopModal()}
                    >
                      Add a shop
                    </button>
                  </div>
                </>
              ) : activeFallbackPlace ? (
                <>
                  <div className="diesel-selection-copy diesel-empty-state-copy">
                    <strong>Nearby option</strong>
                    <p>Not yet verified by Near Me. Leave the first review to help us assess whether it belongs on the map.</p>
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
                    <div className="diesel-selection-footer">
                      <span>{activeFallbackPlace.address}</span>
                    </div>
                    <div className="diesel-empty-state-actions">
                      <a
                        className="diesel-selection-primary control-primary"
                        href={`https://www.google.com/maps/search/?api=1&query=${activeFallbackPlace.latitude},${activeFallbackPlace.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Directions
                      </a>
                      <button
                        className="diesel-selection-secondary control-chip"
                        type="button"
                        onClick={() => openReviewModal({ type: "fallback", place: activeFallbackPlace })}
                      >
                        Review this place
                      </button>
                      <button
                        className="diesel-selection-secondary control-chip"
                        type="button"
                        onClick={() =>
                          openAddShopModal({
                            name: activeFallbackPlace.name,
                            area: activeFallbackPlace.address,
                            note: `Nearby fallback option from ${activeFallbackPlace.source}. Not yet verified by Near Me.`,
                          })
                        }
                      >
                        Add this shop
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
              <div className="diesel-selection-head">
                <div className="diesel-selection-meta">
                  <span>{activeCafe.city}</span>
                  <span>{activeDistance ? formatDistance(activeDistance) : activeCafe.countryCode}</span>
                </div>
                <div className="diesel-selection-score">
                  <strong>{activeRating ?? "New"}</strong>
                  <span>
                    {activeCafe.reviewSummary.reviewCount > 0
                      ? `${activeCafe.reviewSummary.reviewCount} reviews`
                      : "No reviews yet"}
                  </span>
                </div>
              </div>

              <div className="diesel-selection-copy">
                <strong>{activeCafe.name}</strong>
                <p>{activeCafe.summary}</p>
              </div>

              {activeCoffeeProfile || activeTrustMentions.length > 0 || activeTrustQuote ? (
                <div className="diesel-selection-trust">
                  {activeCoffeeProfile ? <ProfileMatchPill cafe={activeCafe} variant="card" /> : null}
                  {activeTrustMentions.length > 0 ? (
                    <div className="diesel-selection-trust-head">
                      <span>People mention</span>
                      <strong>{activeTrustMentions.join(" + ")}</strong>
                    </div>
                  ) : null}
                  {activeTrustQuote ? (
                    <p className="diesel-selection-trust-quote">“{activeTrustQuote}”</p>
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

              <div className="diesel-selection-footer">
                <span>{activeCafe.address}</span>
              </div>

              <div className="diesel-selection-actions">
              <div className="diesel-selection-actions-main">
                {directionsHref ? (
                  <a
                    className="diesel-selection-primary diesel-selection-primary-main control-primary"
                    href={directionsHref}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Directions
                    </a>
                ) : null}
                <Link className="diesel-selection-secondary diesel-selection-secondary-main control-chip" href={`/cafes/${activeCafe.slug}`}>
                  Details
                </Link>
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
                  onClick={() => activeCafe && openReviewModal({ type: "cafe", cafe: activeCafe })}
                  aria-label="Leave a review"
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
                  </svg>
                </button>
              </div>
            </div>

              <div className="diesel-sheet-toolbar">
                <div className="diesel-sheet-state-switcher" role="tablist" aria-label="Sheet size">
                  <button
                    className={`diesel-sheet-state-pill${sheetState === "collapsed" ? " active" : ""}`}
                    type="button"
                    onClick={() => setSheetState("collapsed")}
                    aria-label="Compact card"
                    title="Compact card"
                  >
                    <span className="diesel-sheet-state-icon diesel-sheet-state-icon-card" aria-hidden="true">
                      <span />
                    </span>
                  </button>
                  <button
                    className={`diesel-sheet-state-pill${sheetState === "half" ? " active" : ""}`}
                    type="button"
                    onClick={() => setSheetState("half")}
                    aria-label="Browse list"
                    title="Browse list"
                  >
                    <span className="diesel-sheet-state-icon diesel-sheet-state-icon-list" aria-hidden="true">
                      <span />
                      <span />
                    </span>
                  </button>
                  <button
                    className={`diesel-sheet-state-pill${sheetState === "full" ? " active" : ""}`}
                    type="button"
                    onClick={() => setSheetState("full")}
                    aria-label="Open full sheet"
                    title="Open full sheet"
                  >
                    <span className="diesel-sheet-state-icon diesel-sheet-state-icon-full" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </span>
                  </button>
                </div>
              </div>

              <div className="diesel-sheet-results">
                {rankedCafes.map((cafe) => {
                  const cafeRating =
                    cafe.reviewSummary.reviewCount > 0 ? cafe.reviewSummary.averageRating.toFixed(1) : "New";
                  const cafeTags = cafe.tags.slice(0, 2);
                  const isActive = cafe.id === activeCafe.id;
                  const cafeDistance = userLocation ? cafeDistances.get(cafe.id) ?? null : null;

                  return (
                    <button
                      key={cafe.id}
                      className={`diesel-result-row${isActive ? " active" : ""}`}
                      type="button"
                      onClick={() => {
                        selectCafe(cafe.id, {
                          explicit: true,
                          pan: true,
                          nextSheetState: sheetState === "full" ? "half" : sheetState,
                        });
                      }}
                    >
                      <div className="diesel-result-row-main">
                        <div className="diesel-result-row-copy">
                          <strong>
                            {cafe.name}
                            {favoriteCafeIds.includes(cafe.id) ? <span className="diesel-saved-dot" aria-hidden="true" /> : null}
                          </strong>
                          <span>
                            {[cafe.city, cafeDistance ? formatDistance(cafeDistance) : null, ...cafeTags]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </div>
                        <div className="diesel-result-row-score">
                          <strong>{cafeRating}</strong>
                          <span>{cafe.reviewSummary.reviewCount} reviews</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
                </>
              )}
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
