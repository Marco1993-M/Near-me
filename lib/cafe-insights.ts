import type { Cafe, CafeTrustSignals } from "@/types/cafe";

export type CafeDecisionGuide = {
  trustTitle: string;
  trustSummary: string;
  confidenceLabel: string;
  confidenceDetail: string;
  evidenceQualityLabel: string;
  confidenceRead: string;
  visitDecision: string;
  detourRead: string;
  goIfHeadline: string;
  goIfSupport: string;
  bestFor: string;
  order: string;
  bestForDetail: string;
  orderDetail: string;
  travelFit: string;
  reviewHook: string;
  reviewCtaLabel: string;
  reviewPrompt: string;
  reviewPlaceholder: string;
  shouldPromoteReview: boolean;
  trustBullets: string[];
};

function includesAny(values: string[], needles: string[]) {
  const normalized = values.map((value) => value.toLowerCase());
  return needles.some((needle) => normalized.some((value) => value.includes(needle)));
}

function pickFirst(values: string[], needles: string[]) {
  const normalizedNeedles = needles.map((needle) => needle.toLowerCase());
  return values.find((value) =>
    normalizedNeedles.some((needle) => value.toLowerCase().includes(needle)),
  );
}

function formatList(values: string[]) {
  if (values.length === 0) {
    return "";
  }

  if (values.length === 1) {
    return values[0];
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function getConfidenceRead(reviewCount: number, averageRating: number) {
  if (reviewCount === 0) {
    return {
      label: "Unverified",
      detail: "No reviews yet",
      ctaLabel: "Be the first to review",
      promoteReview: true,
      solid: false,
    };
  }

  if (reviewCount <= 2) {
    return {
      label: "Very early read",
      detail: `${reviewCount} review${reviewCount === 1 ? "" : "s"} so far`,
      ctaLabel: "Add a quick review",
      promoteReview: true,
      solid: false,
    };
  }

  if (reviewCount <= 5 && averageRating < 7.5) {
    return {
      label: "Mixed early read",
      detail: `${averageRating.toFixed(1)} from ${reviewCount} reviews`,
      ctaLabel: "Been here? Review",
      promoteReview: true,
      solid: false,
    };
  }

  if (reviewCount <= 5) {
    return {
      label: "Promising early read",
      detail: `${averageRating.toFixed(1)} from ${reviewCount} reviews`,
      ctaLabel: "Add your take",
      promoteReview: true,
      solid: false,
    };
  }

  if (reviewCount >= 10 && averageRating >= 8.5) {
    return {
      label: "Strong bet",
      detail: `${averageRating.toFixed(1)} from ${reviewCount} reviews`,
      ctaLabel: "Add your take",
      promoteReview: false,
      solid: true,
    };
  }

  if (reviewCount >= 6 && averageRating >= 8) {
    return {
      label: "Solid local signal",
      detail: `${averageRating.toFixed(1)} from ${reviewCount} reviews`,
      ctaLabel: "Add your take",
      promoteReview: false,
      solid: true,
    };
  }

  return {
    label: "Mixed local read",
    detail: `${averageRating.toFixed(1)} from ${reviewCount} reviews`,
    ctaLabel: "Been here? Review",
    promoteReview: true,
    solid: false,
  };
}

export function getCafeReviewPlaceholder(cafe: Pick<Cafe, "drinks">) {
  const cortadoDrink = pickFirst(cafe.drinks, ["cortado"]);
  const espressoDrink = pickFirst(cafe.drinks, ["espresso", "macchiato"]);
  const filterDrink = pickFirst(cafe.drinks, ["filter", "pour over", "pourover", "batch"]);
  const flatWhiteDrink = pickFirst(cafe.drinks, ["flat white"]);
  const drinkPair = [cortadoDrink, espressoDrink].filter((drink): drink is string => Boolean(drink));

  if (drinkPair.length > 0) {
    return `Tried the ${formatList(drinkPair).toLowerCase()}? Say what you ordered, how it landed, and whether you would send someone nearby.`;
  }

  if (filterDrink) {
    return `Tried the ${filterDrink.toLowerCase()}? Mention clarity, sweetness, and whether it is worth a detour.`;
  }

  if (flatWhiteDrink) {
    return `Tried the ${flatWhiteDrink.toLowerCase()}? Mention texture, sweetness, and whether you would recommend it nearby.`;
  }

  return "What did you order, how did it taste, and would you recommend it as a quick stop or a destination?";
}

export function getCafeDecisionGuide(
  cafe: Cafe,
  trustSignals?: CafeTrustSignals | null,
): CafeDecisionGuide {
  const signals = [
    ...cafe.tags,
    ...cafe.drinks,
    ...cafe.roasters,
    ...(trustSignals?.topTags ?? []),
  ];

  const lowerSignals = signals.map((value) => value.toLowerCase());
  const reviewCount = cafe.reviewSummary.reviewCount;
  const averageRating = cafe.reviewSummary.averageRating;
  const confidence = getConfidenceRead(reviewCount, averageRating);

  const cortadoDrink = pickFirst(cafe.drinks, ["cortado"]);
  const flatWhiteDrink = pickFirst(cafe.drinks, ["flat white"]);
  const filterDrink = pickFirst(cafe.drinks, ["filter", "pour over", "pourover", "batch"]);
  const espressoDrink = pickFirst(cafe.drinks, ["espresso", "macchiato"]);
  const cappuccinoDrink = pickFirst(cafe.drinks, ["cappuccino", "latte"]);
  const seasonalDrink = pickFirst(cafe.drinks, ["seasonal", "signature", "cold", "iced"]);

  const milkForward =
    Boolean(cortadoDrink || flatWhiteDrink || cappuccinoDrink) ||
    includesAny(lowerSignals, ["milk drink", "smooth", "chocolatey"]);
  const espressoForward =
    Boolean(espressoDrink) || includesAny(lowerSignals, ["espresso", "bold", "balanced"]);
  const filterForward =
    Boolean(filterDrink) || includesAny(lowerSignals, ["filter", "floral", "fruity"]);
  const quiet =
    includesAny(lowerSignals, ["quiet", "laptop-friendly", "traveler-friendly"]);
  const specialtyForward =
    includesAny(lowerSignals, ["specialty coffee", "roaster-led", "roaster"]);
  const topRated = averageRating >= 8.5 && reviewCount >= 3;
  const socialProof = reviewCount >= 6;
  const worthDetour = topRated || (socialProof && averageRating >= 8);
  const reviewPlaceholder = getCafeReviewPlaceholder(cafe);
  const detailedReviewCount = (trustSignals?.recentReviews ?? []).filter((review) => review.note.trim().length >= 64).length;
  const evidenceQualityLabel =
    reviewCount === 0
      ? "No reviews yet"
      : detailedReviewCount >= Math.ceil(reviewCount / 2)
        ? `${reviewCount} review${reviewCount === 1 ? "" : "s"} with some detail`
        : `${reviewCount} short review${reviewCount === 1 ? "" : "s"} so far`;

  const bestFor = quiet
    ? "Slow coffee breaks and lingering a little longer"
    : milkForward
      ? "Reliable milk drinks and easy recommendation orders"
      : filterForward
        ? "Curious specialty drinkers chasing cleaner cups"
        : espressoForward
          ? "Espresso-forward stops with a bit more intent"
          : "A straightforward specialty coffee stop";

  const order =
    cortadoDrink ??
    flatWhiteDrink ??
    filterDrink ??
    espressoDrink ??
    cappuccinoDrink ??
    seasonalDrink ??
    cafe.drinks[0] ??
    "House coffee";

  const orderDetail = cortadoDrink
    ? "Start with the cortado if you want a fast read on balance, sweetness, and texture."
    : flatWhiteDrink
      ? "A flat white looks like the safest first order here if you want something dependable."
      : filterDrink
        ? "Go for a filter or pour over if you want to see how much care is going into the cup."
        : espressoDrink
          ? "An espresso or short milk drink should tell you quickly whether the coffee-first promise holds up."
          : cappuccinoDrink
            ? "A cappuccino is probably the easiest first order if you want something approachable."
            : "Order the drink that best reflects how you normally judge a cafe.";

  const bestForDetail = quiet
    ? "Best if you like quieter spaces where the coffee can be the main event."
    : milkForward
      ? "Best if you lean toward milk-based drinks and want somewhere you can recommend without overthinking it."
      : filterForward
        ? "Best if you enjoy brighter or more expressive specialty coffee and like trying something a bit more intentional."
        : espressoForward
          ? "Best if you judge a place by its espresso and short milk drinks first."
          : "Best if you want a specialty-leaning stop without needing a deep coffee plan.";

  const trustBullets = Array.from(
    new Set(
      [
        specialtyForward
          ? cafe.roasters[0]
            ? `Roaster-led signal: serving ${cafe.roasters[0]}.`
            : "Roaster-led signal: coffee feels like the focus, not an add-on."
          : null,
        topRated
          ? `Top-rated signal: ${averageRating.toFixed(1)} average from ${reviewCount} reviews.`
          : socialProof
            ? `Social proof: ${reviewCount} reviews already shaping the picture here.`
            : reviewCount > 0
              ? `${reviewCount} review${reviewCount === 1 ? "" : "s"} in so far, which is enough to start a read but not enough to settle it.`
              : "Still early: this one needs more reviews before the full picture sharpens.",
        trustSignals?.topTags?.[0]
          ? `People consistently mention ${formatList(trustSignals.topTags.slice(0, 2)).toLowerCase()}.`
          : cafe.trustPreview.topMentions[0]
            ? `Early signals point to ${formatList(cafe.trustPreview.topMentions.slice(0, 2)).toLowerCase()}.`
            : null,
        quiet ? "Useful if you want a calmer stop instead of a rushed grab-and-go." : null,
        worthDetour ? "Looks like the kind of place that can justify a small detour." : null,
      ].filter(Boolean) as string[],
    ),
  ).slice(0, 4);

  const trustTitle = confidence.label;

  const trustSummary = topRated
    ? `${cafe.name} looks like one of the stronger bets in ${cafe.city} if you want specialty coffee without doing detective work first.`
    : confidence.promoteReview
      ? `${cafe.name} has some useful signals, but Near Me needs a few more specific reviews before calling it a strong pick.`
      : specialtyForward
        ? `${cafe.name} gives off the right specialty-coffee signals and looks like a reasonable first stop in ${cafe.city}.`
    : socialProof
      ? `${cafe.name} is building enough review signal to feel more trustworthy than a random map listing.`
      : `${cafe.name} still needs more reviews, but the early signals are interesting enough to keep it on the radar.`;

  const travelFit = worthDetour
    ? "Good candidate if you are visiting the area and only have time for one careful coffee stop."
    : quiet
      ? "Useful if you need a calmer coffee break while you are exploring the area."
      : "Better as a nearby pick than a long detour unless it matches your drink style exactly.";

  const reviewHook =
    reviewCount > 0
      ? `${evidenceQualityLabel}. A few more thoughtful reviews would make this recommendation much sharper.`
      : "This is exactly the kind of cafe where an early review can really help the next person.";

  const confidenceRead = confidence.label;

  const detourRead = worthDetour
    ? "Worth a detour"
    : reviewCount === 0
      ? "Still unverified"
      : confidence.solid
        ? "Reliable nearby pick"
        : "Nearby try, not a detour yet";

  const goIfHeadline = quiet
    ? "Quiet coffee time"
    : confidence.promoteReview && reviewCount > 0
      ? `${order} nearby try`
    : milkForward
      ? "Reliable cortados and flat whites"
      : filterForward
        ? "Brighter, more expressive cups"
        : espressoForward
          ? "An espresso-first read"
          : "A straightforward specialty stop";

  const goIfSupport = quiet
    ? "Go if you want a calmer stop where the coffee can be the main event."
    : confidence.promoteReview && reviewCount > 0
      ? `Worth trying if you are nearby for ${order.toLowerCase()}, but the review signal is still mixed.`
      : milkForward
        ? "Go if you usually judge a place by its short milk drinks and want an easy first order."
      : filterForward
        ? "Go if you enjoy cleaner, more curious specialty cups instead of the safest default."
        : espressoForward
          ? "Go if you like reading a cafe quickly through espresso and shorter drinks."
          : "Go if you want a specialty-leaning stop without doing too much detective work first.";

  const calibratedBestForDetail =
    confidence.promoteReview && reviewCount > 0
      ? `Probably most useful if you are nearby and want to test the ${order.toLowerCase()} for yourself.`
      : bestForDetail;

  const visitDecision =
    reviewCount === 0
      ? `Not enough review signal yet; add a first coffee read if you have been to ${cafe.name}.`
      : confidence.promoteReview
        ? `Worth trying if you are nearby for ${order.toLowerCase()}, but the review signal is still mixed.`
        : worthDetour
          ? `Worth a detour for ${order.toLowerCase()} if it matches your taste.`
          : `Worth trying for ${order.toLowerCase()}, with enough local signal to trust the read.`;

  const reviewPrompt =
    reviewCount === 0
      ? `Be the first to sharpen this page. ${reviewPlaceholder}`
      : confidence.promoteReview
        ? `This page needs a few more useful notes. ${reviewPlaceholder}`
        : `Add your take for the next coffee run. ${reviewPlaceholder}`;

  return {
    trustTitle,
    trustSummary,
    confidenceLabel: confidence.label,
    confidenceDetail: confidence.detail,
    evidenceQualityLabel,
    confidenceRead,
    visitDecision,
    detourRead,
    goIfHeadline,
    goIfSupport,
    bestFor,
    order,
    bestForDetail: calibratedBestForDetail,
    orderDetail,
    travelFit,
    reviewHook,
    reviewCtaLabel: confidence.ctaLabel,
    reviewPrompt,
    reviewPlaceholder,
    shouldPromoteReview: confidence.promoteReview,
    trustBullets,
  };
}
