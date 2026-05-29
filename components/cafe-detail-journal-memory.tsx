"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  getCafeJournalMemory,
  getStoredCoffeeJournal,
  getStoredCoffeeJournalServerSnapshot,
  subscribeToCoffeeJournal,
} from "@/lib/coffee-journal";

type CafeDetailJournalMemoryProps = {
  cafeId: string;
  cafeName: string;
};

function formatVisitDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "short",
  }).format(date);
}

export function CafeDetailJournalMemory({ cafeId, cafeName }: CafeDetailJournalMemoryProps) {
  const entries = useSyncExternalStore(
    subscribeToCoffeeJournal,
    getStoredCoffeeJournal,
    getStoredCoffeeJournalServerSnapshot,
  );

  const memory = useMemo(
    () => getCafeJournalMemory(entries, { cafeId, cafeName }),
    [cafeId, cafeName, entries],
  );

  if (!memory) {
    return null;
  }

  const lastVisited = formatVisitDate(memory.latestVisitedAt);

  return (
    <article className="cafe-detail-journal-memory">
      <div className="cafe-detail-profile-insight-head">
        <span>Your memory here</span>
        <strong>{memory.visitCount} visit{memory.visitCount === 1 ? "" : "s"}</strong>
      </div>
      <p>
        {memory.lastDrink ? `Last time you had a ${memory.lastDrink.toLowerCase()}` : "You have logged this stop before."}
        {memory.averageRating ? ` You scored it ${memory.averageRating}/10.` : ""}
        {lastVisited ? ` Last logged ${lastVisited}.` : ""}
      </p>
      <div className="cafe-detail-profile-insight-meta">
        {memory.topTags.length > 0 ? <span>{memory.topTags.join(" · ")}</span> : null}
        {memory.latestNote ? <span>“{memory.latestNote}”</span> : null}
      </div>
    </article>
  );
}
