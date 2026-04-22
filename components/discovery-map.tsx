"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FallbackPlace, MapCafe } from "@/types/cafe";

type DiscoveryMapProps = {
  cafes: MapCafe[];
  activeCafeId: string | null;
  onSelectCafe: (cafeId: string) => void;
  panToActiveCafeToken?: number;
  fallbackPlaces?: FallbackPlace[];
  activeFallbackPlaceId?: string | null;
  onSelectFallbackPlace?: (placeId: string) => void;
  panToFallbackPlaceToken?: number;
  userLocation?: { latitude: number; longitude: number } | null;
  selectedRadiusKm?: number;
  locateRequestToken?: number;
  autoLocateOnMount?: boolean;
  onUserLocation?: (coords: { latitude: number; longitude: number }) => void;
  onLocationStateChange?: (
    state: "idle" | "requesting" | "granted" | "denied" | "unavailable",
  ) => void;
};

type LeafletModule = typeof import("leaflet");
type LeafletMap = import("leaflet").Map;
type LeafletLayerGroup = import("leaflet").LayerGroup;
type LeafletMarker = import("leaflet").Marker;

type MappableCafe = MapCafe & { latitude: number; longitude: number };

type CafeMarkerRecord = {
  kind: "cafe";
  cafe: MappableCafe;
  marker: LeafletMarker;
};

type ClusterMarkerRecord = {
  kind: "cluster";
  cafeIds: string[];
  marker: LeafletMarker;
};

type MarkerRecord = CafeMarkerRecord | ClusterMarkerRecord;

type ClusterDisplay = {
  key: string;
  kind: "cafe" | "cluster";
  cafes: MappableCafe[];
  center: [number, number];
};

type FallbackMarkerRecord = {
  place: FallbackPlace;
  marker: LeafletMarker;
};

const defaultCenter: [number, number] = [-33.9249, 18.4241];

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

function panToWithOffset(
  map: LeafletMap,
  L: LeafletModule,
  target: [number, number],
  offsetY: number,
  duration = 0.55,
) {
  const projected = map.project(L.latLng(target[0], target[1]), map.getZoom());
  const shifted = projected.subtract([0, offsetY]);
  const nextCenter = map.unproject(shifted, map.getZoom());

  map.flyTo([nextCenter.lat, nextCenter.lng], map.getZoom(), {
    duration,
    animate: true,
  });
}

function buildCafeMarker(L: LeafletModule, isActive: boolean) {
  return L.divIcon({
    className: "leaflet-marker-reset",
    html: `<span class="nm-marker nm-marker-cafe${isActive ? " active" : ""}"><span class="nm-marker-cafe-dot"></span></span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
  });
}

function buildClusterMarker(L: LeafletModule, count: number, isActiveCluster: boolean) {
  const size = count >= 12 ? 44 : count >= 6 ? 40 : 36;

  return L.divIcon({
    className: "leaflet-marker-reset",
    html: `<span class="nm-marker nm-marker-cluster${isActiveCluster ? " active" : ""}" style="width:${size}px;height:${size}px;">${count}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function buildUserMarker(L: LeafletModule) {
  return L.divIcon({
    className: "leaflet-marker-reset",
    html: `<span class="nm-marker nm-marker-user"></span>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function buildFallbackMarker(L: LeafletModule, isActive: boolean) {
  return L.divIcon({
    className: "leaflet-marker-reset",
    html: `<span class="nm-marker nm-marker-fallback${isActive ? " active" : ""}">?</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildPopupMarkup(cafe: MapCafe) {
  return `<a class="marker-popup-link" href="/cafes/${cafe.slug}">
    <strong>${escapeHtml(cafe.name)}</strong>
    <span>${escapeHtml(cafe.city)}</span>
  </a>`;
}

function buildFallbackPopupMarkup(place: FallbackPlace) {
  return `<div class="marker-popup-link">
    <strong>${escapeHtml(place.name)}</strong>
    <span>${escapeHtml(place.city)} · ${escapeHtml(place.category)}</span>
  </div>`;
}

function buildClusterDisplays(cafes: MappableCafe[], zoom: number, activeCafeId: string | null) {
  if (zoom >= 14) {
    return cafes.map((cafe) => ({
      key: `cafe:${cafe.id}`,
      kind: "cafe" as const,
      cafes: [cafe],
      center: [cafe.latitude, cafe.longitude] as [number, number],
    }));
  }

  const activeCafe = activeCafeId ? cafes.find((cafe) => cafe.id === activeCafeId) ?? null : null;
  const clusterableCafes = activeCafe
    ? cafes.filter((cafe) => cafe.id !== activeCafe.id)
    : cafes;

  const cellSize = zoom <= 10 ? 72 : zoom <= 12 ? 60 : 52;
  const buckets = new Map<string, MappableCafe[]>();

  clusterableCafes.forEach((cafe) => {
    const latBucket = Math.floor(cafe.latitude * cellSize);
    const lngBucket = Math.floor(cafe.longitude * cellSize);
    const key = `${latBucket}:${lngBucket}`;
    const current = buckets.get(key) ?? [];
    current.push(cafe);
    buckets.set(key, current);
  });

  const displays = Array.from(buckets.values()).map((group) => {
    const centerLat = group.reduce((sum, cafe) => sum + cafe.latitude, 0) / group.length;
    const centerLng = group.reduce((sum, cafe) => sum + cafe.longitude, 0) / group.length;
    const sortedIds = group.map((cafe) => cafe.id).sort();

    return {
      key: group.length === 1 ? `cafe:${group[0].id}` : `cluster:${sortedIds.join("|")}`,
      kind: (group.length === 1 ? "cafe" : "cluster") as "cafe" | "cluster",
      cafes: group,
      center: [centerLat, centerLng] as [number, number],
    };
  });

  if (activeCafe) {
    displays.push({
      key: `cafe:${activeCafe.id}`,
      kind: "cafe",
      cafes: [activeCafe],
      center: [activeCafe.latitude, activeCafe.longitude],
    });
  }

  return displays;
}

export function DiscoveryMap({
  cafes,
  activeCafeId,
  onSelectCafe,
  panToActiveCafeToken = 0,
  fallbackPlaces = [],
  activeFallbackPlaceId = null,
  onSelectFallbackPlace,
  panToFallbackPlaceToken = 0,
  userLocation = null,
  selectedRadiusKm = 3,
  locateRequestToken = 0,
  autoLocateOnMount = true,
  onUserLocation,
  onLocationStateChange,
}: DiscoveryMapProps) {
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapZoom, setMapZoom] = useState(13);
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<LeafletModule | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerLayerRef = useRef<LeafletLayerGroup | null>(null);
  const fallbackMarkerLayerRef = useRef<LeafletLayerGroup | null>(null);
  const markerRegistryRef = useRef<Map<string, MarkerRecord>>(new Map());
  const fallbackMarkerRegistryRef = useRef<Map<string, FallbackMarkerRecord>>(new Map());
  const userMarkerRef = useRef<LeafletMarker | null>(null);
  const userRadiusRef = useRef<import("leaflet").Circle | null>(null);
  const hasAutoFramedRef = useRef(false);
  const selectedRadiusKmRef = useRef(selectedRadiusKm);

  useEffect(() => {
    selectedRadiusKmRef.current = selectedRadiusKm;
  }, [selectedRadiusKm]);

  const locateUser = useCallback(() => {
    const L = leafletRef.current;
    const map = mapRef.current;

    if (!L || !map || !navigator.geolocation) {
      onLocationStateChange?.("unavailable");
      return;
    }

    onLocationStateChange?.("requesting");

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const userPosition: [number, number] = [coords.latitude, coords.longitude];
        const nextZoom = Math.max(map.getZoom(), 14);

        hasAutoFramedRef.current = true;
        map.flyTo(userPosition, nextZoom, { duration: 0.8, animate: true });

        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng(userPosition);
        } else {
          userMarkerRef.current = L.marker(userPosition, {
            icon: buildUserMarker(L),
          }).addTo(map);
        }

        if (userRadiusRef.current) {
          userRadiusRef.current.setLatLng(userPosition);
        } else {
          userRadiusRef.current = L.circle(userPosition, {
            radius: selectedRadiusKmRef.current * 1000,
            color: "rgba(31, 106, 56, 0.34)",
            weight: 1.25,
            fillColor: "rgba(199, 245, 211, 0.18)",
            fillOpacity: 1,
            interactive: false,
          }).addTo(map);
        }
        userRadiusRef.current.setRadius(selectedRadiusKmRef.current * 1000);

        onUserLocation?.({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        onLocationStateChange?.("granted");
      },
      (error) => {
        onLocationStateChange?.(
          error.code === error.PERMISSION_DENIED ? "denied" : "unavailable",
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  }, [onLocationStateChange, onUserLocation]);

  const mappableCafes = useMemo(
    () =>
      cafes.filter(
        (cafe): cafe is MappableCafe =>
          typeof cafe.latitude === "number" && typeof cafe.longitude === "number",
      ),
    [cafes],
  );

  const clusteredDisplays = useMemo(
    () => buildClusterDisplays(mappableCafes, mapZoom, activeCafeId),
    [activeCafeId, mappableCafes, mapZoom],
  );

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) {
      return;
    }

    let cancelled = false;
    const registry = markerRegistryRef.current;

    void import("leaflet").then(({ default: L }) => {
      if (cancelled || !mapElementRef.current || mapRef.current) {
        return;
      }

      leafletRef.current = L;

      const map = L.map(mapElementRef.current, {
        zoomControl: false,
        attributionControl: false,
        preferCanvas: true,
      }).setView(defaultCenter, 13);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: "Carto",
        maxZoom: 19,
        updateWhenZooming: false,
        updateWhenIdle: true,
      }).addTo(map);

      map.on("zoomend", () => setMapZoom(map.getZoom()));

      mapRef.current = map;
      markerLayerRef.current = L.layerGroup().addTo(map);
      fallbackMarkerLayerRef.current = L.layerGroup().addTo(map);
      setMapZoom(map.getZoom());
      setIsMapReady(true);

      if (autoLocateOnMount && navigator.geolocation) {
        locateUser();
      }
    });

    return () => {
      cancelled = true;
      registry.forEach(({ marker }) => marker.remove());
      registry.clear();
      mapRef.current?.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
      fallbackMarkerLayerRef.current = null;
      userMarkerRef.current = null;
      userRadiusRef.current = null;
      leafletRef.current = null;
      setIsMapReady(false);
    };
  }, [autoLocateOnMount, locateUser]);

  useEffect(() => {
    if (locateRequestToken === 0) {
      return;
    }

    locateUser();
  }, [locateRequestToken, locateUser]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;

    if (!L || !map || !userLocation) {
      if (userRadiusRef.current) {
        userRadiusRef.current.remove();
        userRadiusRef.current = null;
      }
      return;
    }

    const nextPosition: [number, number] = [userLocation.latitude, userLocation.longitude];

    if (!userRadiusRef.current) {
      userRadiusRef.current = L.circle(nextPosition, {
        radius: selectedRadiusKm * 1000,
        color: "rgba(31, 106, 56, 0.34)",
        weight: 1.25,
        fillColor: "rgba(199, 245, 211, 0.18)",
        fillOpacity: 1,
        interactive: false,
      }).addTo(map);
    } else {
      userRadiusRef.current.setLatLng(nextPosition);
      userRadiusRef.current.setRadius(selectedRadiusKm * 1000);
    }
  }, [selectedRadiusKm, userLocation]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const radiusCircle = userRadiusRef.current;

    if (!L || !map || !radiusCircle || !userLocation) {
      return;
    }

    const bounds = radiusCircle.getBounds();
    const cafesByDistance = [...mappableCafes]
      .map((cafe) => ({
        cafe,
        distanceKm: getDistanceInKm(userLocation, {
          latitude: cafe.latitude,
          longitude: cafe.longitude,
        }),
      }))
      .sort((left, right) => left.distanceKm - right.distanceKm);
    const cafesInsideRadius = cafesByDistance.filter((entry) => entry.distanceKm <= selectedRadiusKm);
    const cafesToFrame =
      cafesInsideRadius.length > 0 ? cafesInsideRadius.slice(0, 10) : cafesByDistance.slice(0, 6);

    cafesToFrame.forEach(({ cafe }) => {
      bounds.extend(L.latLng(cafe.latitude, cafe.longitude));
    });

    if (!bounds.isValid()) {
      return;
    }

    map.fitBounds(bounds, {
      paddingTopLeft: [48, 64],
      paddingBottomRight: [48, 220],
      maxZoom: 14,
      animate: true,
    });
  }, [mappableCafes, selectedRadiusKm, userLocation]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const layerGroup = markerLayerRef.current;

    if (!isMapReady || !L || !map || !layerGroup) {
      return;
    }

    const registry = markerRegistryRef.current;
    const nextKeys = new Set(clusteredDisplays.map((display) => display.key));

    registry.forEach(({ marker }, key) => {
      if (nextKeys.has(key)) {
        return;
      }

      layerGroup.removeLayer(marker);
      registry.delete(key);
    });

    clusteredDisplays.forEach((display) => {
      const existing = registry.get(display.key);
      const isActiveCluster = display.cafes.some((cafe) => cafe.id === activeCafeId);

      if (existing) {
        existing.marker.setLatLng(display.center);

        if (existing.kind === "cafe" && display.kind === "cafe") {
          existing.cafe = display.cafes[0];
          existing.marker.setPopupContent(buildPopupMarkup(display.cafes[0]));
          existing.marker.setIcon(buildCafeMarker(L, display.cafes[0].id === activeCafeId));
        }

        if (existing.kind === "cluster" && display.kind === "cluster") {
          existing.cafeIds = display.cafes.map((cafe) => cafe.id);
          existing.marker.setIcon(buildClusterMarker(L, display.cafes.length, isActiveCluster));
        }

        return;
      }

      if (display.kind === "cafe") {
        const cafe = display.cafes[0];
        const marker = L.marker(display.center, {
          icon: buildCafeMarker(L, cafe.id === activeCafeId),
          riseOnHover: true,
        });
        marker.setZIndexOffset(cafe.id === activeCafeId ? 1400 : 700);

        marker.on("click", () => onSelectCafe(cafe.id));
        marker.bindPopup(buildPopupMarkup(cafe), {
          closeButton: false,
          autoPanPadding: [24, 24],
          className: "marker-popup-shell",
          offset: [0, -18],
        });
        marker.addTo(layerGroup);

        registry.set(display.key, { kind: "cafe", cafe, marker });
        return;
      }

      const clusterMarker = L.marker(display.center, {
        icon: buildClusterMarker(L, display.cafes.length, isActiveCluster),
        riseOnHover: true,
      });
      clusterMarker.setZIndexOffset(isActiveCluster ? 850 : 350);

      clusterMarker.on("click", () => {
        const bounds = L.latLngBounds(display.cafes.map((cafe) => [cafe.latitude, cafe.longitude]));

        if (bounds.isValid()) {
          map.fitBounds(bounds, {
            padding: [56, 56],
            maxZoom: Math.max(map.getZoom() + 2, 14),
            animate: true,
          });
          return;
        }

        map.flyTo(display.center, Math.max(map.getZoom() + 2, 14), {
          duration: 0.45,
          animate: true,
        });
      });
      clusterMarker.addTo(layerGroup);

      registry.set(display.key, {
        kind: "cluster",
        cafeIds: display.cafes.map((cafe) => cafe.id),
        marker: clusterMarker,
      });
    });

    if (!hasAutoFramedRef.current && mappableCafes.length > 0) {
      const bounds = L.latLngBounds(mappableCafes.map((cafe) => [cafe.latitude, cafe.longitude]));

      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [56, 56],
          maxZoom: 13,
        });
        hasAutoFramedRef.current = true;
      }
    }
  }, [activeCafeId, clusteredDisplays, isMapReady, mappableCafes, onSelectCafe]);

  useEffect(() => {
    const L = leafletRef.current;
    const layerGroup = fallbackMarkerLayerRef.current;

    if (!isMapReady || !L || !layerGroup) {
      return;
    }

    const registry = fallbackMarkerRegistryRef.current;
    const nextIds = new Set(fallbackPlaces.map((place) => place.id));

    registry.forEach(({ marker }, key) => {
      if (nextIds.has(key)) {
        return;
      }

      layerGroup.removeLayer(marker);
      registry.delete(key);
    });

    fallbackPlaces.forEach((place) => {
      const existing = registry.get(place.id);

      if (existing) {
        existing.place = place;
        existing.marker.setLatLng([place.latitude, place.longitude]);
        existing.marker.setIcon(buildFallbackMarker(L, place.id === activeFallbackPlaceId));
        existing.marker.setZIndexOffset(place.id === activeFallbackPlaceId ? 1250 : 250);
        return;
      }

      const marker = L.marker([place.latitude, place.longitude], {
        icon: buildFallbackMarker(L, place.id === activeFallbackPlaceId),
        riseOnHover: true,
      });

      marker.setZIndexOffset(place.id === activeFallbackPlaceId ? 1250 : 250);
      marker.on("click", () => onSelectFallbackPlace?.(place.id));
      marker.bindPopup(buildFallbackPopupMarkup(place), {
        closeButton: false,
        autoPanPadding: [24, 24],
        className: "marker-popup-shell",
        offset: [0, -12],
      });
      marker.addTo(layerGroup);

      registry.set(place.id, { place, marker });
    });
  }, [activeFallbackPlaceId, fallbackPlaces, isMapReady, onSelectFallbackPlace]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const registry = markerRegistryRef.current;

    if (!isMapReady) {
      return;
    }

    registry.forEach((record) => {
      if (record.kind === "cafe") {
        if (L) {
          record.marker.setIcon(buildCafeMarker(L, record.cafe.id === activeCafeId));
        }
        record.marker.setZIndexOffset(record.cafe.id === activeCafeId ? 1400 : 700);

        if (record.cafe.id === activeCafeId) {
          record.marker.openPopup();
        } else {
          record.marker.closePopup();
        }

        return;
      }

      if (L) {
        record.marker.setIcon(
          buildClusterMarker(L, record.cafeIds.length, record.cafeIds.includes(activeCafeId ?? "")),
        );
      }
      record.marker.setZIndexOffset(record.cafeIds.includes(activeCafeId ?? "") ? 850 : 350);
    });
  }, [activeCafeId, isMapReady]);

  useEffect(() => {
    const L = leafletRef.current;
    const registry = fallbackMarkerRegistryRef.current;

    if (!isMapReady || !L) {
      return;
    }

    registry.forEach((record) => {
      record.marker.setIcon(buildFallbackMarker(L, record.place.id === activeFallbackPlaceId));
      record.marker.setZIndexOffset(record.place.id === activeFallbackPlaceId ? 1250 : 250);

      if (record.place.id === activeFallbackPlaceId) {
        record.marker.openPopup();
      } else {
        record.marker.closePopup();
      }
    });
  }, [activeFallbackPlaceId, isMapReady]);

  useEffect(() => {
    if (!panToActiveCafeToken) {
      return;
    }

    const L = leafletRef.current;
    const map = mapRef.current;
    const registry = markerRegistryRef.current;
    const activeCafe = activeCafeId
      ? Array.from(registry.values()).find(
          (record): record is CafeMarkerRecord => record.kind === "cafe" && record.cafe.id === activeCafeId,
        )?.cafe ?? null
      : null;

    if (!isMapReady || !L || !map || !activeCafe) {
      return;
    }

    panToWithOffset(map, L, [activeCafe.latitude, activeCafe.longitude], 96);
  }, [activeCafeId, isMapReady, panToActiveCafeToken]);

  useEffect(() => {
    if (!panToFallbackPlaceToken) {
      return;
    }

    const L = leafletRef.current;
    const map = mapRef.current;
    const registry = fallbackMarkerRegistryRef.current;
    const activeFallbackPlace = activeFallbackPlaceId
      ? registry.get(activeFallbackPlaceId)?.place ?? null
      : null;

    if (!isMapReady || !L || !map || !activeFallbackPlace) {
      return;
    }

    panToWithOffset(map, L, [activeFallbackPlace.latitude, activeFallbackPlace.longitude], 96);
  }, [activeFallbackPlaceId, isMapReady, panToFallbackPlaceToken]);

  return <div ref={mapElementRef} className="map-canvas" />;
}
