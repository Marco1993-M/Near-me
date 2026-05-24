type CandidateReview = {
  rating?: number;
  note?: string;
  tags?: string[];
};

type CandidatePayload = {
  reviews?: CandidateReview[];
  latest_review?: CandidateReview | null;
  support_count?: number;
  support_notes?: string[];
};

export type CandidateTrustSnapshot = {
  reviewCount: number;
  averageRating: number | null;
  topTags: string[];
  latestNote: string | null;
  supporterCount: number;
  stageLabel: string;
};

function titleizeTag(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getCandidateTrustSnapshot(payload: CandidatePayload | null | undefined): CandidateTrustSnapshot {
  const reviews = Array.isArray(payload?.reviews) ? payload?.reviews ?? [] : [];
  const supportCount = Number(payload?.support_count ?? 0);
  const ratingValues = reviews
    .map((review) => Number(review.rating))
    .filter((rating) => Number.isFinite(rating) && rating >= 1 && rating <= 10);
  const averageRating =
    ratingValues.length > 0
      ? Number((ratingValues.reduce((sum, rating) => sum + rating, 0) / ratingValues.length).toFixed(1))
      : null;

  const tagCounts = new Map<string, number>();
  for (const review of reviews) {
    for (const tag of review.tags ?? []) {
      const label = titleizeTag(tag);
      tagCounts.set(label, (tagCounts.get(label) ?? 0) + 1);
    }
  }

  const topTags = Array.from(tagCounts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 3)
    .map(([tag]) => tag);

  const latestNote = payload?.latest_review?.note?.trim() || reviews.at(-1)?.note?.trim() || null;
  const totalSignals = reviews.length + supportCount;

  const stageLabel =
    totalSignals >= 4
      ? "Ready for Near Me review"
      : totalSignals >= 2
        ? "Building trust"
        : "Early local signal";

  return {
    reviewCount: reviews.length,
    averageRating,
    topTags,
    latestNote,
    supporterCount: supportCount,
    stageLabel,
  };
}
