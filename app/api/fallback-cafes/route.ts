import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { getCandidateTrustSnapshot } from "@/lib/candidate-trust";
import { CANONICAL_TABLES } from "@/lib/db-schema";
import { siteConfig } from "@/lib/site";
import { getSupabaseServerClient } from "@/lib/supabase";
import type { FallbackPlace } from "@/types/cafe";

type OverpassElement = {
  id: number;
  type: string;
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: Record<string, string | undefined>;
};

const EXCLUDED_FALLBACK_NAME_PATTERNS = [
  /\bstarbucks\b/i,
  /\bvida e caff[eè]\b/i,
  /\bmugg\s*&\s*bean\b/i,
  /\bwoolworths\b/i,
];

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

function buildAddress(tags: Record<string, string | undefined> | undefined) {
  if (!tags) {
    return "Address not listed";
  }

  const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
  const locality = [
    tags["addr:suburb"],
    tags["addr:city"] ?? tags.town ?? tags.village ?? tags.hamlet,
  ]
    .filter(Boolean)
    .join(", ");

  return [street, locality].filter(Boolean).join(" · ") || tags.name || "Address not listed";
}

function getCity(tags: Record<string, string | undefined> | undefined) {
  if (!tags) {
    return "Nearby";
  }

  return tags["addr:city"] ?? tags.town ?? tags.village ?? tags.hamlet ?? tags["addr:suburb"] ?? "Nearby";
}

function getCategory(tags: Record<string, string | undefined> | undefined) {
  if (!tags) {
    return "Coffee stop";
  }

  if (tags.craft === "coffee_roaster") {
    return "Coffee roaster";
  }

  if (tags.shop === "coffee") {
    return "Coffee shop";
  }

  return "Cafe";
}

function toFallbackPlace(
  element: OverpassElement,
  userLocation: { latitude: number; longitude: number },
): FallbackPlace | null {
  const latitude = element.lat ?? element.center?.lat;
  const longitude = element.lon ?? element.center?.lon;
  const name = element.tags?.name;

  if (!latitude || !longitude || !name) {
    return null;
  }

  if (EXCLUDED_FALLBACK_NAME_PATTERNS.some((pattern) => pattern.test(name))) {
    return null;
  }

  return {
    id: `${element.type}-${element.id}`,
    source: "osm-overpass",
    name,
    address: buildAddress(element.tags),
    city: getCity(element.tags),
    category: getCategory(element.tags),
    latitude,
    longitude,
    distanceKm: getDistanceInKm(userLocation, { latitude, longitude }),
    website: element.tags?.website ?? null,
  };
}

const getFallbackPlaces = unstable_cache(
  async (
    latitude: number,
    longitude: number,
    radiusMeters: number,
  ): Promise<FallbackPlace[]> => {
    const query = `
[out:json][timeout:20];
(
  node(around:${radiusMeters},${latitude},${longitude})["amenity"="cafe"];
  way(around:${radiusMeters},${latitude},${longitude})["amenity"="cafe"];
  node(around:${radiusMeters},${latitude},${longitude})["shop"="coffee"];
  way(around:${radiusMeters},${latitude},${longitude})["shop"="coffee"];
  node(around:${radiusMeters},${latitude},${longitude})["craft"="coffee_roaster"];
  way(around:${radiusMeters},${latitude},${longitude})["craft"="coffee_roaster"];
);
out center tags;
`;

    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=UTF-8",
        "User-Agent": `${siteConfig.name} fallback discovery (${siteConfig.suggestCafeEmail})`,
      },
      body: query,
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as { elements?: OverpassElement[] };
    const userLocation = { latitude, longitude };
    const seen = new Set<string>();

    return (payload.elements ?? [])
      .map((element) => toFallbackPlace(element, userLocation))
      .filter((place): place is FallbackPlace => Boolean(place))
      .filter((place) => {
        const key = `${place.name.toLowerCase()}__${place.latitude.toFixed(4)}__${place.longitude.toFixed(4)}`;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 8);
  },
  ["fallback-cafes"],
  { revalidate: 300 },
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latitude = Number(searchParams.get("lat"));
  const longitude = Number(searchParams.get("lng"));
  const requestedRadiusKm = Number(searchParams.get("radiusKm") ?? "3");
  const clampedRadiusKm = Math.min(Math.max(requestedRadiusKm, 1), 10);
  const radiusMeters = Math.min(Math.max(Math.round(Math.max(requestedRadiusKm * 4, 15) * 1000), 15000), 50000);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ places: [] }, { status: 400 });
  }

  try {
    const roundedLatitude = Number(latitude.toFixed(3));
    const roundedLongitude = Number(longitude.toFixed(3));
    const places = (await getFallbackPlaces(roundedLatitude, roundedLongitude, radiusMeters))
      .filter((place) => place.distanceKm <= clampedRadiusKm)
      .slice(0, 8);

    const supabase = getSupabaseServerClient();
    if (!supabase || places.length === 0) {
      return NextResponse.json({ places });
    }

    const { data: sourceRow } = await supabase
      .from(CANONICAL_TABLES.placeSources)
      .select("id")
      .eq("code", "osm-overpass")
      .maybeSingle();

    if (!sourceRow?.id) {
      return NextResponse.json({ places });
    }

    const { data: sourcePlaces } = await supabase
      .from(CANONICAL_TABLES.sourcePlaces)
      .select("external_id, payload")
      .eq("source_id", sourceRow.id)
      .in("external_id", places.map((place) => place.id))
      .neq("match_status", "ignored");

    const trustByExternalId = new Map(
      (sourcePlaces ?? []).map((sourcePlace) => [
        sourcePlace.external_id,
        getCandidateTrustSnapshot(
          sourcePlace.payload && typeof sourcePlace.payload === "object"
            ? (sourcePlace.payload as {
                reviews?: Array<{ rating?: number; note?: string; tags?: string[] }>;
                latest_review?: { rating?: number; note?: string; tags?: string[] } | null;
                support_count?: number;
                support_notes?: string[];
              })
            : null,
        ),
      ]),
    );

    const placesWithTrust = places.map((place) => ({
      ...place,
      trust: trustByExternalId.get(place.id) ?? null,
    }));

    return NextResponse.json({ places: placesWithTrust });
  } catch {
    return NextResponse.json({ places: [] }, { status: 200 });
  }
}
