import type { CoffeeJournalEntry } from "@/lib/coffee-journal";
import type { CoffeeProfileState } from "@/lib/coffee-profiler";

export type UserCoffeeDataSnapshot = {
  journalEntries: CoffeeJournalEntry[];
  favoriteCafeIds: string[];
  profileState: CoffeeProfileState | null;
};

type UserCoffeeDataRow = {
  journal_entries?: unknown;
  favorite_cafe_ids?: unknown;
  profile_state?: unknown;
};

function normalizeFavoriteCafeIds(input: unknown) {
  if (!Array.isArray(input)) {
    return [] as string[];
  }

  return Array.from(
    new Set(input.filter((value): value is string => typeof value === "string" && value.trim().length > 0)),
  );
}

function normalizeProfileState(input: unknown): CoffeeProfileState | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const candidate = input as Partial<CoffeeProfileState> & {
    scores?: Record<string, unknown>;
  };

  if (!candidate.profileSlug || !candidate.updatedAt || !candidate.scores) {
    return null;
  }

  return candidate as CoffeeProfileState;
}

function normalizeJournalEntries(input: unknown) {
  if (!Array.isArray(input)) {
    return [] as CoffeeJournalEntry[];
  }

  return input.filter((entry): entry is CoffeeJournalEntry => Boolean(entry && typeof entry === "object"));
}

export function parseUserCoffeeDataRow(row: UserCoffeeDataRow | null | undefined): UserCoffeeDataSnapshot | null {
  if (!row) {
    return null;
  }

  return {
    journalEntries: normalizeJournalEntries(row.journal_entries),
    favoriteCafeIds: normalizeFavoriteCafeIds(row.favorite_cafe_ids),
    profileState: normalizeProfileState(row.profile_state),
  };
}

export function mergeUserCoffeeDataSnapshots(
  localSnapshot: UserCoffeeDataSnapshot,
  remoteSnapshot: UserCoffeeDataSnapshot | null,
): UserCoffeeDataSnapshot {
  if (!remoteSnapshot) {
    return localSnapshot;
  }

  const mergedFavoriteCafeIds = Array.from(
    new Set([...localSnapshot.favoriteCafeIds, ...remoteSnapshot.favoriteCafeIds]),
  );

  const mergedJournalEntries = [...localSnapshot.journalEntries, ...remoteSnapshot.journalEntries];

  const localUpdatedAt = localSnapshot.profileState?.updatedAt ?? "";
  const remoteUpdatedAt = remoteSnapshot.profileState?.updatedAt ?? "";
  const mergedProfileState =
    localUpdatedAt >= remoteUpdatedAt ? localSnapshot.profileState : remoteSnapshot.profileState;

  return {
    journalEntries: mergedJournalEntries,
    favoriteCafeIds: mergedFavoriteCafeIds,
    profileState: mergedProfileState,
  };
}

export function serializeUserCoffeeDataSnapshot(snapshot: UserCoffeeDataSnapshot) {
  return {
    journal_entries: snapshot.journalEntries,
    favorite_cafe_ids: snapshot.favoriteCafeIds,
    profile_state: snapshot.profileState,
  };
}

export function getUserCoffeeDataSnapshotHash(snapshot: UserCoffeeDataSnapshot) {
  return JSON.stringify(serializeUserCoffeeDataSnapshot(snapshot));
}
