const FAVORITES_STORAGE_KEY = "near-me-favorite-cafes";
const FAVORITES_EVENT = "near-me-favorites-updated";
const EMPTY_FAVORITES: string[] = [];

let cachedFavoritesRaw: string | null | undefined;
let cachedFavoritesValue: string[] = EMPTY_FAVORITES;

function readFavorites() {
  if (typeof window === "undefined") {
    return EMPTY_FAVORITES;
  }

  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (raw === cachedFavoritesRaw) {
      return cachedFavoritesValue;
    }

    const parsed = raw ? JSON.parse(raw) : EMPTY_FAVORITES;
    cachedFavoritesRaw = raw;
    cachedFavoritesValue = Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : EMPTY_FAVORITES;
    return cachedFavoritesValue;
  } catch {
    cachedFavoritesRaw = null;
    cachedFavoritesValue = EMPTY_FAVORITES;
    return EMPTY_FAVORITES;
  }
}

function writeFavorites(nextFavorites: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(nextFavorites));
  window.dispatchEvent(new CustomEvent(FAVORITES_EVENT, { detail: nextFavorites }));
}

export function getFavoriteCafeIds() {
  return readFavorites();
}

export function getFavoriteCafeIdsServerSnapshot() {
  return EMPTY_FAVORITES;
}

export function isFavoriteCafe(cafeId: string) {
  return readFavorites().includes(cafeId);
}

export function toggleFavoriteCafe(cafeId: string) {
  const favorites = readFavorites();
  const nextFavorites = favorites.includes(cafeId)
    ? favorites.filter((id) => id !== cafeId)
    : [cafeId, ...favorites];

  writeFavorites(nextFavorites);
  return nextFavorites;
}

export function subscribeToFavoriteCafes(listener: (favoriteIds: string[]) => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = () => listener(readFavorites());
  const handleCustomEvent = (event: Event) => {
    const detail = (event as CustomEvent<string[]>).detail;
    listener(Array.isArray(detail) ? detail : readFavorites());
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(FAVORITES_EVENT, handleCustomEvent);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(FAVORITES_EVENT, handleCustomEvent);
  };
}
