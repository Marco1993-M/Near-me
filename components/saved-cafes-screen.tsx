"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import type { Cafe } from "@/types/cafe";
import {
  getFavoriteCafeIds,
  getFavoriteCafeIdsServerSnapshot,
  subscribeToFavoriteCafes,
} from "@/lib/favorites";
import { ProfileMatchPill } from "@/components/profile-match-pill";

type SavedCafesScreenProps = {
  cafes: Cafe[];
};

export function SavedCafesScreen({ cafes }: SavedCafesScreenProps) {
  const favoriteIds = useSyncExternalStore(
    (onStoreChange) => subscribeToFavoriteCafes(() => onStoreChange()),
    getFavoriteCafeIds,
    getFavoriteCafeIdsServerSnapshot,
  );

  const savedCafes = useMemo(() => {
    const favoriteSet = new Set(favoriteIds);
    return cafes.filter((cafe) => favoriteSet.has(cafe.id));
  }, [cafes, favoriteIds]);

  return (
    <main className="section-stack">
      <section className="panel section-card">
        <h1>Saved cafes</h1>
        <p>
          Keep your shortlist close. Save strong options from the map, then reopen them here when you are ready to
          decide.
        </p>
      </section>

      <section className="panel section-card">
        {savedCafes.length > 0 ? (
          <ul className="route-list">
            {savedCafes.map((cafe, index) => (
              <li className="route-item" key={cafe.id}>
                <div>
                  <strong>
                    #{index + 1} {cafe.name}
                  </strong>
                  <span>
                    {cafe.city} · {cafe.reviewSummary.reviewCount > 0 ? cafe.reviewSummary.averageRating.toFixed(1) : "New"} ·{" "}
                    {cafe.reviewSummary.reviewCount} reviews
                  </span>
                  <div className="saved-cafe-meta">
                    <ProfileMatchPill cafe={cafe} />
                  </div>
                </div>
                <Link href={`/cafes/${cafe.slug}`}>Open</Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="sheet-grid">
            <p className="screen-subtitle">
              No saved cafes yet. When a spot feels promising on the map, tap Save and it will show up here.
            </p>
            <Link className="back-chip" href="/">
              Back to map
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
