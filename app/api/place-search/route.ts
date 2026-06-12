import { NextResponse } from "next/server";
import { siteConfig } from "@/lib/site";
import type { FallbackPlace } from "@/types/cafe";

type NominatimPlace = {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  type?: string;
  class?: string;
  extratags?: {
    website?: string;
  };
  address?: {
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
  };
};

const QUERY_ALIASES: Record<string, string[]> = {
  bootleggers: ["bootlegger", "bootleggers coffee company"],
  bootlegger: ["bootleggers", "bootleggers coffee company"],
};

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

function normalizePlace(
  place: NominatimPlace,
  userLocation: { latitude: number; longitude: number } | null,
): FallbackPlace | null {
  const latitude = Number(place.lat);
  const longitude = Number(place.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const name =
    place.name?.trim() ||
    place.display_name
      .split(",")[0]
      ?.trim();

  if (!name) {
    return null;
  }

  const city =
    place.address?.city ??
    place.address?.town ??
    place.address?.village ??
    place.address?.suburb ??
    "Nearby";

  const category =
    place.type === "coffee_shop" || place.type === "cafe"
      ? "Cafe"
      : place.class === "shop"
        ? "Coffee shop"
        : "Coffee stop";

  return {
    id: `search-${place.place_id}`,
    source: "osm-nominatim",
    name,
    address: place.display_name,
    city,
    category,
    latitude,
    longitude,
    distanceKm: userLocation ? getDistanceInKm(userLocation, { latitude, longitude }) : 0,
    website: place.extratags?.website ?? null,
    trust: null,
  };
}

function buildSearchQueries(query: string) {
  const normalized = query.trim().toLowerCase();
  const base = [query.trim(), `${query.trim()} coffee`];
  const aliases = Object.entries(QUERY_ALIASES)
    .filter(([key]) => normalized.includes(key))
    .flatMap(([, values]) => values);

  return [...new Set([...base, ...aliases])].filter(Boolean);
}

function getNameMatchScore(place: FallbackPlace, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedName = place.name.trim().toLowerCase();

  if (normalizedName === normalizedQuery) {
    return 3;
  }

  if (normalizedName.startsWith(normalizedQuery)) {
    return 2.2;
  }

  if (normalizedName.includes(normalizedQuery)) {
    return 1.5;
  }

  return 0.6;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const latitude = Number(searchParams.get("lat"));
  const longitude = Number(searchParams.get("lng"));
  const userLocation =
    Number.isFinite(latitude) && Number.isFinite(longitude)
      ? { latitude, longitude }
      : null;

  if (query.length < 2) {
    return NextResponse.json({ places: [] });
  }

  try {
    const queries = buildSearchQueries(query);
    const payloads = await Promise.all(
      queries.map(async (searchTerm) => {
        const nominatimParams = new URLSearchParams({
          q: searchTerm,
          format: "jsonv2",
          addressdetails: "1",
          extratags: "1",
          limit: userLocation ? "10" : "6",
        });

        if (userLocation) {
          const halfWidth = 0.45;
          const halfHeight = 0.3;
          nominatimParams.set(
            "viewbox",
            [
              (userLocation.longitude - halfWidth).toFixed(4),
              (userLocation.latitude + halfHeight).toFixed(4),
              (userLocation.longitude + halfWidth).toFixed(4),
              (userLocation.latitude - halfHeight).toFixed(4),
            ].join(","),
          );
        }

        const response = await fetch(`https://nominatim.openstreetmap.org/search?${nominatimParams.toString()}`, {
          headers: {
            "Accept-Language": "en",
            "User-Agent": `${siteConfig.name} place search (${siteConfig.suggestCafeEmail})`,
          },
          cache: "no-store",
        });

        if (!response.ok) {
          return [] as NominatimPlace[];
        }

        return (await response.json()) as NominatimPlace[];
      }),
    );

    const payload = payloads.flat();
    const seen = new Set<string>();
    const places = payload
      .map((place) => normalizePlace(place, userLocation))
      .filter((place): place is FallbackPlace => Boolean(place))
      .filter((place) => {
        const key = `${place.name.toLowerCase()}__${place.latitude.toFixed(4)}__${place.longitude.toFixed(4)}`;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      })
      .sort((left, right) => {
        const leftScore = getNameMatchScore(left, query) - left.distanceKm * 0.08;
        const rightScore = getNameMatchScore(right, query) - right.distanceKm * 0.08;
        return rightScore - leftScore;
      })
      .slice(0, 6);

    return NextResponse.json({ places });
  } catch {
    return NextResponse.json({ places: [] });
  }
}
