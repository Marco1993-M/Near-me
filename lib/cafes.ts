import { unstable_cache } from "next/cache";
import { cache } from "react";
import type { Cafe, CafeReview, CafeTrustPreview, CafeTrustSignals, CityHighlight } from "@/types/cafe";
import { CANONICAL_TABLES } from "@/lib/db-schema";
import { getSupabaseServerClient } from "@/lib/supabase";

type CafeRow = {
  id: string;
  slug: string | null;
  name: string | null;
  city_id: string | null;
  country_code: string | null;
  address_line1: string | null;
  latitude: number | null;
  longitude: number | null;
  website: string | null;
  phone: string | null;
  photo_url: string | null;
  summary: string | null;
  review_count: number | null;
  average_rating: number | null;
};

type CityRow = {
  id: string;
  slug: string;
  name: string;
  country_code: string;
};

type RoasterRow = {
  id: string;
  name: string;
};

type CafeRoasterRow = {
  cafe_id: string;
  roaster_id: string;
};

type CafeTagRow = {
  cafe_id: string;
  tag: string;
};

type CafeReviewDrinkRow = {
  cafe_id: string;
  drink: string | null;
};

type CanonicalCafeBundle = {
  cafes: Cafe[];
  cityHighlights: CityHighlight[];
};

type CanonicalReviewRow = {
  id: string;
  cafe_id: string;
  rating: number | null;
  note: string | null;
  drink: string | null;
  created_at: string;
};

type ReviewTagRow = {
  review_id: string;
  tag: string;
};

const SUPABASE_IN_CHUNK_SIZE = 120;
const LAUNCH_EXCLUDED_NAME_PATTERNS = [
  /\bstarbucks\b/i,
  /\bvida e caff[eè]\b/i,
  /\bmugg\s*&\s*bean\b/i,
  /\bwoolworths\b/i,
  /\bbootlegger\b/i,
];
const LAUNCH_EXCLUDED_CITY_NAMES = new Set(["Unknown City"]);

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
}

function titleizeTag(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildSummary(city: string, tags: string[], reviewCount: number) {
  const lead = tags.length > 0 ? tags.slice(0, 2).join(" and ").toLowerCase() : "quality coffee";
  const proof =
    reviewCount > 0
      ? `backed by ${reviewCount} review${reviewCount === 1 ? "" : "s"}`
      : "ready for first-hand discovery";

  return `A ${lead} cafe in ${city}, ${proof}.`;
}

function isLaunchEligibleCafe(input: { name: string; city: string }) {
  if (LAUNCH_EXCLUDED_CITY_NAMES.has(input.city)) {
    return false;
  }

  return !LAUNCH_EXCLUDED_NAME_PATTERNS.some((pattern) => pattern.test(input.name));
}

function normalizeDrinks(rows: CafeReviewDrinkRow[]) {
  return Array.from(
    new Set(
      rows
        .map((row) => row.drink?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

function buildCafeTags(input: {
  cafeId: string;
  averageRating: number;
  reviewCount: number;
  roasters: string[];
  drinks: string[];
  tagsByCafeId: Map<string, string[]>;
}) {
  const explicitTags = (input.tagsByCafeId.get(input.cafeId) ?? []).map(titleizeTag);
  const derivedTags = [
    input.reviewCount >= 8 ? "Popular" : null,
    input.averageRating >= 8.5 ? "Top rated" : null,
    input.roasters.length > 0 ? "Roaster-led" : null,
    input.drinks.some((drink) => drink.toLowerCase() === "flat white") ? "Flat white" : null,
  ].filter(Boolean) as string[];

  return Array.from(new Set([...explicitTags, ...derivedTags]));
}

function buildTrustPreview(input: {
  cafeId: string;
  cafeTags: string[];
  reviewRowsByCafeId: Map<string, CanonicalReviewRow[]>;
  reviewTagsByCafeId: Map<string, string[]>;
  summary: string;
}): CafeTrustPreview {
  const topMentions = Array.from(
    new Set([
      ...(input.reviewTagsByCafeId.get(input.cafeId) ?? []).map(titleizeTag),
      ...input.cafeTags,
    ]),
  ).slice(0, 2);
  const recentQuoteSource = (input.reviewRowsByCafeId.get(input.cafeId) ?? []).find((review) =>
    Boolean(review.note?.trim()),
  )?.note;

  return {
    topMentions,
    recentQuote: recentQuoteSource?.trim() || input.summary,
  };
}

function chunkValues<T>(values: T[], size = SUPABASE_IN_CHUNK_SIZE) {
  const chunks: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

async function selectInChunks<T>(input: {
  supabase: ReturnType<typeof getSupabaseServerClient>;
  table: string;
  select: string;
  column: string;
  values: string[];
  apply?: (query: any) => any;
}) {
  if (!input.supabase || input.values.length === 0) {
    return { data: [] as T[], error: null };
  }

  const chunks = chunkValues(input.values);
  const results = await Promise.all(
    chunks.map((chunk) => {
      const baseQuery = input.supabase!.from(input.table).select(input.select).in(input.column, chunk);
      return input.apply ? input.apply(baseQuery) : baseQuery;
    }),
  );

  const failedResult = results.find((result) => result.error);
  if (failedResult?.error) {
    return { data: [] as T[], error: failedResult.error };
  }

  return {
    data: results.flatMap((result) => (result.data as T[] | null) ?? []),
    error: null,
  };
}

async function fetchCanonicalCafeBundleUncached(): Promise<CanonicalCafeBundle | null> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    console.error("[cafes] Missing Supabase server client while fetching canonical cafe bundle.");
    return null;
  }

  const { data: cafeRows, error: cafeError } = await supabase
    .from(CANONICAL_TABLES.cafes)
    .select(
      `
        id,
        slug,
        name,
        city_id,
        country_code,
        address_line1,
        latitude,
        longitude,
        website,
        phone,
        photo_url,
        summary,
        review_count,
        average_rating
      `,
    )
    .eq("status", "active")
    .order("review_count", { ascending: false })
    .order("average_rating", { ascending: false, nullsFirst: false })
    .limit(1000);

  if (cafeError) {
    console.error("[cafes] Failed to fetch cafes_new rows.", cafeError);
    return null;
  }

  if (!cafeRows || cafeRows.length === 0) {
    console.warn("[cafes] No active cafes returned from cafes_new.");
    return null;
  }

  const cafesRaw = cafeRows as CafeRow[];
  const cafeIds = cafesRaw.map((row) => row.id);
  const cityIds = Array.from(new Set(cafesRaw.map((row) => row.city_id).filter(Boolean))) as string[];

  const [
    { data: cityRows, error: cityError },
    { data: cafeRoasterRows, error: cafeRoasterError },
    { data: roasterRows, error: roasterError },
    { data: cafeTagRows, error: cafeTagError },
    { data: cafeDrinkRows, error: cafeDrinkError },
    { data: reviewRows, error: reviewError },
  ] = await Promise.all([
    cityIds.length > 0
      ? selectInChunks<CityRow>({
          supabase,
          table: CANONICAL_TABLES.cities,
          select: "id, slug, name, country_code",
          column: "id",
          values: cityIds,
        })
      : Promise.resolve({ data: [], error: null }),
    cafeIds.length > 0
      ? selectInChunks<CafeRoasterRow>({
          supabase,
          table: CANONICAL_TABLES.cafeRoasters,
          select: "cafe_id, roaster_id",
          column: "cafe_id",
          values: cafeIds,
        })
      : Promise.resolve({ data: [], error: null }),
    supabase.from(CANONICAL_TABLES.roasters).select("id, name"),
    cafeIds.length > 0
      ? selectInChunks<CafeTagRow>({
          supabase,
          table: CANONICAL_TABLES.cafeTags,
          select: "cafe_id, tag",
          column: "cafe_id",
          values: cafeIds,
        })
      : Promise.resolve({ data: [], error: null }),
    cafeIds.length > 0
      ? selectInChunks<CafeReviewDrinkRow>({
          supabase,
          table: CANONICAL_TABLES.reviews,
          select: "cafe_id, drink",
          column: "cafe_id",
          values: cafeIds,
          apply: (query) => query.not("drink", "is", null),
        })
      : Promise.resolve({ data: [], error: null }),
    cafeIds.length > 0
      ? selectInChunks<CanonicalReviewRow>({
          supabase,
          table: CANONICAL_TABLES.reviews,
          select: "id, cafe_id, rating, note, drink, created_at",
          column: "cafe_id",
          values: cafeIds,
          apply: (query) => query.eq("status", "approved").order("created_at", { ascending: false }),
        })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (cityError || cafeRoasterError || roasterError || cafeTagError || cafeDrinkError || reviewError) {
    console.error("[cafes] Failed to fetch related canonical cafe data.", {
      cityError,
      cafeRoasterError,
      roasterError,
      cafeTagError,
      cafeDrinkError,
      reviewError,
    });
    return null;
  }

  const reviewsRaw = (reviewRows as CanonicalReviewRow[]) ?? [];
  const reviewIds = reviewsRaw.map((review) => review.id);
  const { data: reviewTagRows, error: reviewTagError } = reviewIds.length
    ? await selectInChunks<ReviewTagRow>({
        supabase,
        table: CANONICAL_TABLES.reviewTags,
        select: "review_id, tag",
        column: "review_id",
        values: reviewIds,
      })
    : { data: [], error: null };

  if (reviewTagError) {
    console.error("[cafes] Failed to fetch review tag rows.", reviewTagError);
    return null;
  }

  const citiesById = new Map((cityRows as CityRow[]).map((city) => [city.id, city]));
  const roasterNamesById = new Map((roasterRows as RoasterRow[]).map((roaster) => [roaster.id, roaster.name]));

  const roastersByCafeId = new Map<string, string[]>();
  for (const row of (cafeRoasterRows as CafeRoasterRow[]) ?? []) {
    const roasterName = roasterNamesById.get(row.roaster_id);
    if (!roasterName) {
      continue;
    }

    const current = roastersByCafeId.get(row.cafe_id) ?? [];
    current.push(roasterName);
    roastersByCafeId.set(row.cafe_id, current);
  }

  const tagsByCafeId = new Map<string, string[]>();
  for (const row of (cafeTagRows as CafeTagRow[]) ?? []) {
    const current = tagsByCafeId.get(row.cafe_id) ?? [];
    current.push(row.tag);
    tagsByCafeId.set(row.cafe_id, current);
  }

  const drinksByCafeId = new Map<string, CafeReviewDrinkRow[]>();
  for (const row of (cafeDrinkRows as CafeReviewDrinkRow[]) ?? []) {
    const current = drinksByCafeId.get(row.cafe_id) ?? [];
    current.push(row);
    drinksByCafeId.set(row.cafe_id, current);
  }

  const reviewsByCafeId = new Map<string, CanonicalReviewRow[]>();
  for (const row of reviewsRaw) {
    const current = reviewsByCafeId.get(row.cafe_id) ?? [];
    current.push(row);
    reviewsByCafeId.set(row.cafe_id, current);
  }

  const reviewTagsByReviewId = new Map<string, string[]>();
  for (const row of (reviewTagRows as ReviewTagRow[]) ?? []) {
    const current = reviewTagsByReviewId.get(row.review_id) ?? [];
    current.push(row.tag);
    reviewTagsByReviewId.set(row.review_id, current);
  }

  const reviewTagsByCafeId = new Map<string, string[]>();
  for (const review of reviewsRaw) {
    const current = reviewTagsByCafeId.get(review.cafe_id) ?? [];
    current.push(...(reviewTagsByReviewId.get(review.id) ?? []));
    reviewTagsByCafeId.set(review.cafe_id, current);
  }

  const cafes = cafesRaw
    .map((row) => {
      const city = row.city_id ? citiesById.get(row.city_id) : null;
      if (!row.name || !city) {
        return null;
      }

      const reviewCount = Number(row.review_count ?? 0);
      const averageRating = Number(row.average_rating ?? 0);
      const roasters = Array.from(new Set(roastersByCafeId.get(row.id) ?? []));
      const drinks = normalizeDrinks(drinksByCafeId.get(row.id) ?? []);
      const tags = buildCafeTags({
        cafeId: row.id,
        averageRating,
        reviewCount,
        roasters,
        drinks,
        tagsByCafeId,
      });
      const summary = row.summary || buildSummary(city.name, tags, reviewCount);
      const trustPreview = buildTrustPreview({
        cafeId: row.id,
        cafeTags: tags,
        reviewRowsByCafeId: reviewsByCafeId,
        reviewTagsByCafeId,
        summary,
      });

      return {
        id: row.id,
        slug: row.slug || slugify(row.name),
        name: row.name,
        city: city.name,
        countryCode: row.country_code || city.country_code || "ZA",
        address: row.address_line1 || city.name,
        latitude: row.latitude,
        longitude: row.longitude,
        website: row.website,
        phone: row.phone,
        roasters,
        drinks,
        tags,
        photo: row.photo_url,
        summary,
        reviewSummary: {
          averageRating,
          reviewCount,
        },
        trustPreview,
      } satisfies Cafe;
    })
    .filter((cafe): cafe is Cafe => Boolean(cafe))
    .filter((cafe) => isLaunchEligibleCafe({ name: cafe.name, city: cafe.city }));

  const byCity = new Map<string, Cafe[]>();
  for (const cafe of cafes) {
    const key = `${cafe.city}__${cafe.countryCode}`;
    const current = byCity.get(key) ?? [];
    current.push(cafe);
    byCity.set(key, current);
  }

  const cityHighlights = Array.from(byCity.entries()).map(([key, cityCafes]) => {
    const [name, countryCode] = key.split("__");
    const canonicalCity = (cityRows as CityRow[]).find(
      (city) => city.name === name && city.country_code === countryCode,
    );
    const topRated = [...cityCafes].sort(
      (a, b) => b.reviewSummary.averageRating - a.reviewSummary.averageRating,
    )[0];

    return {
      slug: canonicalCity?.slug ?? slugify(name),
      name,
      countryCode,
      cafeCount: cityCafes.length,
      topRatedCafe: topRated?.name ?? null,
    } satisfies CityHighlight;
  });

  return {
    cafes,
    cityHighlights,
  };
}

const getCanonicalCafeBundle = cache(
  unstable_cache(
    async () => fetchCanonicalCafeBundleUncached(),
    ["canonical-cafe-bundle"],
    { revalidate: 300 },
  ),
);

export const getFeaturedCafes = cache(async () => {
  try {
    const bundle = await getCanonicalCafeBundle();

    if (!bundle || bundle.cafes.length === 0) {
      return [];
    }

    return bundle.cafes.sort((a, b) => {
      const scoreA = a.reviewSummary.averageRating * 4 + a.reviewSummary.reviewCount;
      const scoreB = b.reviewSummary.averageRating * 4 + b.reviewSummary.reviewCount;
      return scoreB - scoreA;
    });
  } catch (error) {
    console.error("[cafes] Unexpected getFeaturedCafes failure.", error);
    return [];
  }
});

export const getCafeBySlug = cache(async (slug: string) => {
  const cafes = await getFeaturedCafes();
  return cafes.find((cafe) => cafe.slug === slug) ?? null;
});

const getCafeTrustSignalsBySlugCached = unstable_cache(
  async (slug: string): Promise<CafeTrustSignals | null> => {
    const cafe = await getCafeBySlug(slug);
    const supabase = getSupabaseServerClient();

    if (!cafe || !supabase) {
      return null;
    }

    const { data: reviewRows, error: reviewError } = await supabase
      .from(CANONICAL_TABLES.reviews)
      .select("id, cafe_id, rating, note, drink, created_at")
      .eq("cafe_id", cafe.id)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(6);

    if (reviewError || !reviewRows) {
      return null;
    }

    const reviewsRaw = reviewRows as CanonicalReviewRow[];
    const reviewIds = reviewsRaw.map((review) => review.id);
    const { data: reviewTagRows, error: reviewTagError } = reviewIds.length
      ? await supabase
          .from(CANONICAL_TABLES.reviewTags)
          .select("review_id, tag")
          .in("review_id", reviewIds)
      : { data: [], error: null };

    if (reviewTagError) {
      return null;
    }

    const tagsByReviewId = new Map<string, string[]>();
    for (const row of (reviewTagRows as ReviewTagRow[]) ?? []) {
      const current = tagsByReviewId.get(row.review_id) ?? [];
      current.push(titleizeTag(row.tag));
      tagsByReviewId.set(row.review_id, current);
    }

    const tagCounts = new Map<string, number>();
    for (const tags of tagsByReviewId.values()) {
      for (const tag of tags) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    }

    const recentReviews: CafeReview[] = reviewsRaw.map((review) => ({
      id: review.id,
      rating: Number(review.rating ?? 0),
      note: review.note?.trim() || "Good coffee, worth checking out.",
      drink: review.drink,
      tags: tagsByReviewId.get(review.id) ?? [],
      createdAt: review.created_at,
    }));

    const topTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 4)
      .map(([tag]) => tag);

    return {
      topTags,
      recentReviews,
    };
  },
  ["cafe-trust-signals-by-slug"],
  { revalidate: 300 },
);

export function getCafeTrustSignalsBySlug(slug: string): Promise<CafeTrustSignals | null> {
  return getCafeTrustSignalsBySlugCached(slug);
}

export const getCityHighlights = cache(async () => {
  try {
    const bundle = await getCanonicalCafeBundle();

    if (!bundle || bundle.cityHighlights.length === 0) {
      return [];
    }

    return bundle.cityHighlights.sort((a, b) => b.cafeCount - a.cafeCount).slice(0, 12);
  } catch {
    return [];
  }
});

export const getCafeStaticParams = cache(async () => {
  const cafes = await getFeaturedCafes();
  return cafes.map((cafe) => ({ slug: cafe.slug }));
});

export const getCityStaticParams = cache(async () => {
  const cities = await getCityHighlights();
  return cities.map((city) => ({ slug: city.slug }));
});
