import { NextResponse } from "next/server";
import { siteConfig } from "@/lib/site";
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

  if (!latitude || !longitude || !element.tags?.name) {
    return null;
  }

  return {
    id: `${element.type}-${element.id}`,
    source: "osm-overpass",
    name: element.tags.name,
    address: buildAddress(element.tags),
    city: getCity(element.tags),
    category: getCategory(element.tags),
    latitude,
    longitude,
    distanceKm: getDistanceInKm(userLocation, { latitude, longitude }),
    website: element.tags.website ?? null,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latitude = Number(searchParams.get("lat"));
  const longitude = Number(searchParams.get("lng"));
  const requestedRadiusKm = Number(searchParams.get("radiusKm") ?? "3");
  const radiusMeters = Math.min(Math.max(Math.round(Math.max(requestedRadiusKm * 4, 15) * 1000), 15000), 50000);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ places: [] }, { status: 400 });
  }

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

  try {
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
      return NextResponse.json({ places: [] }, { status: 200 });
    }

    const payload = (await response.json()) as { elements?: OverpassElement[] };
    const userLocation = { latitude, longitude };
    const seen = new Set<string>();
    const places = (payload.elements ?? [])
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

    return NextResponse.json({ places });
  } catch {
    return NextResponse.json({ places: [] }, { status: 200 });
  }
}
