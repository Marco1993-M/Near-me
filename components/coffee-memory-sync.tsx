"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { User } from "@supabase/supabase-js";
import {
  getStoredCoffeeJournal,
  getStoredCoffeeJournalServerSnapshot,
  setStoredCoffeeJournal,
  subscribeToCoffeeJournal,
} from "@/lib/coffee-journal";
import {
  getStoredCoffeeProfileState,
  getStoredCoffeeProfileStateServerSnapshot,
  setStoredCoffeeProfileState,
  subscribeToCoffeeProfile,
} from "@/lib/coffee-profiler";
import {
  getFavoriteCafeIds,
  getFavoriteCafeIdsServerSnapshot,
  setFavoriteCafeIds,
  subscribeToFavoriteCafes,
} from "@/lib/favorites";
import { trackEvent } from "@/lib/analytics";
import { CANONICAL_TABLES } from "@/lib/db-schema";
import { getSupabaseClient } from "@/lib/supabase";
import {
  getUserCoffeeDataSnapshotHash,
  mergeUserCoffeeDataSnapshots,
  parseUserCoffeeDataRow,
  serializeUserCoffeeDataSnapshot,
  type UserCoffeeDataSnapshot,
} from "@/lib/user-coffee-data";

export function CoffeeMemorySync() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [hydratedUserId, setHydratedUserId] = useState<string | null>(null);
  const hydrationInFlightRef = useRef(false);
  const lastUploadedHashRef = useRef<string | null>(null);
  const uploadTimeoutRef = useRef<number | null>(null);

  const journalEntries = useSyncExternalStore(
    subscribeToCoffeeJournal,
    getStoredCoffeeJournal,
    getStoredCoffeeJournalServerSnapshot,
  );
  const favoriteCafeIds = useSyncExternalStore(
    (onStoreChange) => subscribeToFavoriteCafes(() => onStoreChange()),
    getFavoriteCafeIds,
    getFavoriteCafeIdsServerSnapshot,
  );
  const profileState = useSyncExternalStore(
    subscribeToCoffeeProfile,
    getStoredCoffeeProfileState,
    getStoredCoffeeProfileStateServerSnapshot,
  );

  useEffect(() => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      return;
    }

    let cancelled = false;

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) {
        return;
      }

      setAuthUser(data.session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
      if (!session?.user) {
        setHydratedUserId(null);
        lastUploadedHashRef.current = null;
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const supabase = getSupabaseClient();

    if (!supabase || !authUser || hydratedUserId === authUser.id) {
      return;
    }

    let cancelled = false;
    hydrationInFlightRef.current = true;

    const localSnapshot: UserCoffeeDataSnapshot = {
      journalEntries,
      favoriteCafeIds,
      profileState,
    };

    void supabase
      .from(CANONICAL_TABLES.userCoffeeData)
      .select("journal_entries,favorite_cafe_ids,profile_state")
      .eq("user_id", authUser.id)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (cancelled) {
          return;
        }

        if (error) {
          hydrationInFlightRef.current = false;
          return;
        }

        const remoteSnapshot = parseUserCoffeeDataRow(data);
        const mergedSnapshot = mergeUserCoffeeDataSnapshots(localSnapshot, remoteSnapshot);

        setStoredCoffeeJournal(mergedSnapshot.journalEntries);
        setFavoriteCafeIds(mergedSnapshot.favoriteCafeIds);
        if (mergedSnapshot.profileState) {
          setStoredCoffeeProfileState(mergedSnapshot.profileState);
        }

        const mergedHash = getUserCoffeeDataSnapshotHash(mergedSnapshot);
        const { error: upsertError } = await supabase.from(CANONICAL_TABLES.userCoffeeData).upsert(
          {
            user_id: authUser.id,
            ...serializeUserCoffeeDataSnapshot(mergedSnapshot),
          },
          { onConflict: "user_id" },
        );

        hydrationInFlightRef.current = false;

        if (cancelled) {
          return;
        }

        if (!upsertError) {
          lastUploadedHashRef.current = mergedHash;
          setHydratedUserId(authUser.id);
          trackEvent("coffee_memory_synced", {
            source: remoteSnapshot ? "merge" : "bootstrap",
          });
        }
      });

    return () => {
      cancelled = true;
      hydrationInFlightRef.current = false;
    };
  }, [authUser, favoriteCafeIds, hydratedUserId, journalEntries, profileState]);

  useEffect(() => {
    const supabase = getSupabaseClient();

    if (!supabase || !authUser || hydratedUserId !== authUser.id || hydrationInFlightRef.current) {
      return;
    }

    const snapshot: UserCoffeeDataSnapshot = {
      journalEntries,
      favoriteCafeIds,
      profileState,
    };
    const nextHash = getUserCoffeeDataSnapshotHash(snapshot);

    if (nextHash === lastUploadedHashRef.current) {
      return;
    }

    if (uploadTimeoutRef.current) {
      window.clearTimeout(uploadTimeoutRef.current);
    }

    uploadTimeoutRef.current = window.setTimeout(() => {
      void supabase
        .from(CANONICAL_TABLES.userCoffeeData)
        .upsert(
          {
            user_id: authUser.id,
            ...serializeUserCoffeeDataSnapshot(snapshot),
          },
          { onConflict: "user_id" },
        )
        .then(({ error }) => {
          if (!error) {
            lastUploadedHashRef.current = nextHash;
          }
        });
    }, 500);

    return () => {
      if (uploadTimeoutRef.current) {
        window.clearTimeout(uploadTimeoutRef.current);
        uploadTimeoutRef.current = null;
      }
    };
  }, [authUser, favoriteCafeIds, hydratedUserId, journalEntries, profileState]);

  return null;
}
