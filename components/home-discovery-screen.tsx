"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Cafe } from "@/types/cafe";
import { DiscoveryMap } from "@/components/discovery-map";
import { ProfileMatchPill } from "@/components/profile-match-pill";
import {
  applyProfilerOptionScores,
  COFFEE_PROFILER_EVENT,
  coffeeProfilerQuestions,
  COFFEE_PROFILER_STORAGE_KEY,
  defaultProfilerScores,
  getCafeProfileMatchScore,
  getCoffeeProfileBySlug,
  getStoredCoffeeProfileSlug,
  getStoredCoffeeProfileSlugServerSnapshot,
  resolveCoffeeProfile,
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
const reviewTags = ["Specialty coffee", "Quiet", "Laptop-friendly", "Pastries", "Outdoor seating", "Friendly service"];
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

export function HomeDiscoveryScreen({ cafes }: HomeDiscoveryScreenProps) {
  const pathname = usePathname();
  const mappableCafes = useMemo(
    () =>
      cafes.filter(
        (cafe) => typeof cafe.latitude === "number" && typeof cafe.longitude === "number",
      ),
    [cafes],
  );
  const [activeCafeId, setActiveCafeId] = useState<string | null>(mappableCafes[0]?.id ?? null);
  const [panToActiveCafeToken, setPanToActiveCafeToken] = useState(0);
  const [locateRequestToken, setLocateRequestToken] = useState(0);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedRadiusKm, setSelectedRadiusKm] = useState(3);
  const [locationState, setLocationState] = useState<
    "idle" | "requesting" | "granted" | "denied" | "unavailable"
  >("idle");
  const [sheetState, setSheetState] = useState<"collapsed" | "half" | "full">("collapsed");
  const [isTopPicksOpen, setIsTopPicksOpen] = useState(false);
  const [topPickLens, setTopPickLens] = useState<"nearby" | "worth-it" | "work" | "for-you">("nearby");
  const [isProfilerOpen, setIsProfilerOpen] = useState(false);
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
  const reviewSuccessTimeoutRef = useRef<number | null>(null);
  const reviewToastTimeoutRef = useRef<number | null>(null);
  const hasExplicitCafeSelectionRef = useRef(false);

  const coffeeProfileSlug = useSyncExternalStore(
    subscribeToCoffeeProfile,
    getStoredCoffeeProfileSlug,
    getStoredCoffeeProfileSlugServerSnapshot,
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
    mappableCafes.find((cafe) => cafe.id === activeCafeId) ?? mappableCafes[0] ?? cafes[0] ?? null;
  const activeCoffeeProfile = useMemo(
    () => getCoffeeProfileBySlug(coffeeProfileSlug),
    [coffeeProfileSlug],
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
  const isOverlayOpen = isSearchOpen || isTopPicksOpen || isProfilerOpen;
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
            const leftScore = getCafeProfileMatchScore(left, activeCoffeeProfile) + leftRadiusBonus - leftDistance * 0.12;
            const rightScore = getCafeProfileMatchScore(right, activeCoffeeProfile) + rightRadiusBonus - rightDistance * 0.12;
            return rightScore - leftScore;
          })
          .slice(0, 6)
      : [];

    return { nearby, worthIt, work, forYou };
  }, [activeCoffeeProfile, cafeDistances, mappableCafes, rankedCafes, selectedRadiusKm]);
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
  const emptyStateTitle = nearestKnownCafes.length > 0 ? `No specialty spots in ${selectedRadiusKm} km` : "We have not mapped this area yet";
  const emptyStateBody =
    nearestKnownCafes.length > 0
      ? "Nothing in the current radius yet, but there are still good options a little farther out."
      : "This area looks empty in our database right now. You can widen the search or help put this town on Near Me.";
  const suggestCafeHref = useMemo(() => {
    const subject = "Suggest a cafe for Near Me";
    const lines = [
      "Hi Near Me,",
      "",
      "I want to suggest a cafe to add to the map.",
      "",
      `Current radius: ${selectedRadiusKm} km`,
      userLocation ? `My location: ${userLocation.latitude.toFixed(5)}, ${userLocation.longitude.toFixed(5)}` : null,
      "",
      "Cafe name:",
      "Address / area:",
      "Why it belongs on Near Me:",
    ].filter(Boolean);

    return `mailto:${siteConfig.suggestCafeEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
  }, [selectedRadiusKm, userLocation]);

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

    setActiveCafeId(cafeId);

    if (options?.pan) {
      setPanToActiveCafeToken((current) => current + 1);
    }

    if (options?.nextSheetState) {
      setSheetState(options.nextSheetState);
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

    const matchedCafe = mappableCafes.find((cafe) => cafe.slug === slug) ?? cafes.find((cafe) => cafe.slug === slug);

    if (!matchedCafe) {
      return;
    }

    hasExplicitCafeSelectionRef.current = true;
    setActiveCafeId((current) => (current === matchedCafe.id ? current : matchedCafe.id));
    setSheetState("half");
    setIsSearchOpen(false);
    setIsTopPicksOpen(false);
    setIsProfilerOpen(false);
  }, [cafes, mappableCafes, pathname]);

  useEffect(() => {
    if (mappableCafes.length === 0) {
      setActiveCafeId(null);
      return;
    }

    const activeDistance = activeCafeId ? cafeDistances.get(activeCafeId) : undefined;
    const activeWithinRadius =
      !userLocation ||
      activeDistance === undefined ||
      activeDistance <= selectedRadiusKm;

    if (hasExplicitCafeSelectionRef.current && activeCafeId && activeWithinRadius) {
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

  function closeTopPicks() {
    setIsTopPicksOpen(false);
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

  function saveResolvedProfile(nextProfileSlug: string) {
    window.localStorage.setItem(COFFEE_PROFILER_STORAGE_KEY, nextProfileSlug);
    window.dispatchEvent(new CustomEvent(COFFEE_PROFILER_EVENT, { detail: nextProfileSlug }));
  }

  function handleProfilerSingleChoice(optionIndex: number) {
    const question = coffeeProfilerQuestions[profilerQuestionIndex];
    const option = question.options[optionIndex];
    const nextScores = applyProfilerOptionScores(profilerScores, option);

    if (profilerQuestionIndex === coffeeProfilerQuestions.length - 1) {
      saveResolvedProfile(resolveCoffeeProfile(nextScores).slug);
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
        saveResolvedProfile(resolveCoffeeProfile(nextScores).slug);
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

  function openReviewModal() {
    if (reviewSuccessTimeoutRef.current) {
      window.clearTimeout(reviewSuccessTimeoutRef.current);
      reviewSuccessTimeoutRef.current = null;
    }
    resetReviewForm();
    setIsReviewOpen(true);
  }

  function closeReviewModal() {
    setIsReviewOpen(false);
    setReviewState("idle");
    setReviewMessage("");
  }

  function toggleReviewTag(tag: string) {
    setSelectedReviewTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag].slice(0, 3),
    );
  }

  async function handleReviewSubmit() {
    if (!activeCafe) {
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

    const supabase = getSupabaseClient();

    if (!supabase) {
      setReviewState("error");
      setReviewMessage("Reviews are unavailable until Supabase is configured.");
      return;
    }

    const anonId = getAnonymousReviewerId();
    const duplicateKey = `near-me-review:${activeCafe.id}:${anonId}`;

    if (window.localStorage.getItem(duplicateKey)) {
      setReviewState("error");
      setReviewMessage("You already left a review for this cafe on this device.");
      return;
    }

    setReviewState("submitting");
    setReviewMessage("");

    const payload = {
      cafe_id: activeCafe.id,
      rating: reviewRating,
      note: reviewNote.trim(),
      drink: reviewDrink,
      anon_id: anonId,
      status: "pending",
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

    window.localStorage.setItem(duplicateKey, "1");
    setReviewState("success");
    setReviewMessage("Review sent. Thanks for helping the next coffee run.");
    setReviewToast(`Review saved for ${activeCafe.name}`);

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
          >
            <span>{locationCopy.caption}</span>
            <strong>{locationCopy.label}</strong>
          </button>

          <div className="diesel-topbar-actions">
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
            <button
              className="diesel-action-chip control-chip"
              type="button"
              aria-label="Open top picks"
              onClick={openTopPicks}
            >
              Top picks
            </button>
            <button
              className="diesel-action-chip control-chip"
              type="button"
              aria-label="Search coffee shops"
              onClick={openSearch}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4.5 4.5" />
              </svg>
              Search
            </button>
          </div>
        </div>

        {locationState === "granted" && userLocation ? (
          <div className="map-radius-shell fade-slide-in">
            <div className="map-radius-switcher" role="tablist" aria-label="Nearby radius">
              {radiusOptionsKm.map((radiusKm) => (
                <button
                  key={radiusKm}
                  className={`map-radius-pill${selectedRadiusKm === radiusKm ? " active" : ""}`}
                  type="button"
                  onClick={() => setSelectedRadiusKm(radiusKm)}
                  aria-label={`Show cafes within ${radiusKm} kilometers`}
                >
                  {radiusKm} km
                </button>
              ))}
            </div>
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
                  const profileMatch = activeCoffeeProfile ? Math.round(getCafeProfileMatchScore(cafe, activeCoffeeProfile) * 10) : null;

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
                          <span className="map-top-pick-match">Great match for your profile · {profileMatch}%</span>
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

        {activeCafe ? (
          <>
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

                  {nearestKnownCafes.length > 0 ? (
                    <div className="diesel-empty-state-nearest">
                      <span>Closest known cafes</span>
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
                    <a
                      className="diesel-selection-secondary control-chip"
                      href={suggestCafeHref}
                    >
                      Suggest a cafe
                    </a>
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

              {activeTrustMentions.length > 0 || activeTrustQuote ? (
                <div className="diesel-selection-trust">
                  <ProfileMatchPill cafe={activeCafe} variant="card" />
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
                  onClick={openReviewModal}
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

        {activeCafe && isReviewOpen ? (
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
                <span className="review-modal-kicker">Quick review</span>
                <h2 id="review-modal-title">How was {activeCafe.name}?</h2>
                <p>Keep it short and useful. Rate the coffee, pick your drink, and add one clear note.</p>
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
