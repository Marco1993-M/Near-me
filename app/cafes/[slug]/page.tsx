import type { Metadata } from "next";
import Link from "next/link";
import { ProfileMatchPill } from "@/components/profile-match-pill";
import { getCafeBySlug, getCafeTrustSignalsBySlug } from "@/lib/cafes";

export const revalidate = 300;

type CafePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: CafePageProps): Promise<Metadata> {
  const { slug } = await params;
  const cafe = await getCafeBySlug(slug);
  const title = cafe?.name
    ? cafe.name
    : slug
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");

  return {
    title: cafe ? `${cafe.name} in ${cafe.city}` : title,
    description: cafe?.summary
      ? cafe.summary
      : "Canonical cafe page scaffold for future trusted cafe information, reviews, and local discovery.",
    alternates: {
      canonical: `/cafes/${slug}`,
    },
  };
}

export default async function CafePage({ params }: CafePageProps) {
  const { slug } = await params;
  const [cafe, trustSignals] = await Promise.all([
    getCafeBySlug(slug),
    getCafeTrustSignalsBySlug(slug),
  ]);

  if (!cafe) {
    return (
      <main className="screen-stack">
        <section className="sheet-card">
          <h1 className="screen-title">Cafe not found</h1>
          <p className="screen-subtitle">
            This canonical route exists, but the cafe record still needs to be migrated
            into the new data layer.
          </p>
        </section>
      </main>
    );
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CafeOrCoffeeShop",
    name: cafe.name,
    address: cafe.address,
    telephone: cafe.phone,
    url: `https://www.near-me.cafe/cafes/${cafe.slug}`,
    aggregateRating:
      cafe.reviewSummary.reviewCount > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: cafe.reviewSummary.averageRating.toFixed(1),
            reviewCount: cafe.reviewSummary.reviewCount,
          }
        : undefined,
  };
  const directionsHref =
    typeof cafe.latitude === "number" && typeof cafe.longitude === "number"
      ? `https://www.google.com/maps/search/?api=1&query=${cafe.latitude},${cafe.longitude}`
      : null;
  const scoreLabel =
    cafe.reviewSummary.reviewCount > 0 ? cafe.reviewSummary.averageRating.toFixed(1) : "New";
  const topTags = trustSignals?.topTags ?? [];
  const recentReviews = trustSignals?.recentReviews ?? [];
  const leadingTags = topTags.length > 0 ? topTags : cafe.tags.slice(0, 4);
  const trustSummary = (() => {
    const parts = [
      leadingTags[0] ? `${leadingTags[0].toLowerCase()} energy` : null,
      cafe.drinks[0] ? `best known for ${cafe.drinks[0].toLowerCase()}` : null,
      cafe.roasters[0] ? `serving ${cafe.roasters[0]}` : null,
    ].filter(Boolean);

    if (parts.length === 0) {
      return cafe.summary;
    }

    return `${cafe.city} stop with ${parts.join(", ")}.`;
  })();
  const primaryMeta = [
    cafe.city,
    leadingTags[0] ?? null,
    cafe.drinks[0] ?? null,
  ].filter(Boolean);
  const coordinateLabel =
    typeof cafe.latitude === "number" && typeof cafe.longitude === "number"
      ? `${cafe.latitude.toFixed(3)}, ${cafe.longitude.toFixed(3)}`
      : `${cafe.city}, ${cafe.countryCode}`;

  return (
    <main className="cafe-detail-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <section className="cafe-detail-map">
        <div className="app-map" aria-hidden="true">
          <div className="map-grid" />
          <div className="map-focus-chip map-focus-chip-top">Selected on map</div>
          <div className="map-focus-chip map-focus-chip-side">{coordinateLabel}</div>
          <div className="map-road" />
          <div className="map-road-secondary" />
          <span className="map-road-label one">Near Me</span>
          <span className="map-road-label two">{cafe.city}</span>
          <div className="map-callout">
            <div className="map-callout-bubble">
              <div className="map-callout-copy">
                <strong>{cafe.name}</strong>
                <span>{leadingTags[0] ?? cafe.city}</span>
              </div>
              <div className="map-callout-score">
                <strong>{scoreLabel}</strong>
              </div>
            </div>
            <div className="map-callout-tail" />
          </div>
          <div className="map-pin-pulse" />
          <div className="map-pin" />
          <div className="map-address-pill">{cafe.address}</div>
        </div>
        <div className="cafe-detail-overlay">
          <section className="cafe-detail-card cafe-detail-card-enter panel">
            <div className="cafe-detail-card-top">
              <Link className="back-chip cafe-detail-close" href="/">
                <span aria-hidden="true">←</span>
                <span>Back to map</span>
              </Link>
            </div>

            <div className="cafe-detail-card-head">
              <div className="diesel-selection-meta">
                {primaryMeta.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
              <div className="diesel-selection-score">
                <strong>{scoreLabel}</strong>
                <span>
                  {cafe.reviewSummary.reviewCount > 0
                    ? `${cafe.reviewSummary.reviewCount} reviews`
                    : "No reviews yet"}
                </span>
              </div>
            </div>

            <div className="diesel-selection-copy">
              <h1 className="cafe-detail-title">{cafe.name}</h1>
              <p>{trustSummary}</p>
            </div>

            <ProfileMatchPill cafe={cafe} variant="card" />

            <div className="cafe-detail-quick-grid">
              <article className="cafe-detail-quick-card">
                <span>Why go</span>
                <strong>{leadingTags[0] ?? "Good coffee"}</strong>
              </article>
              <article className="cafe-detail-quick-card">
                <span>Order</span>
                <strong>{cafe.drinks[0] ?? "House coffee"}</strong>
              </article>
              <article className="cafe-detail-quick-card">
                <span>Roaster</span>
                <strong>{cafe.roasters[0] ?? "Local selection"}</strong>
              </article>
            </div>

            <div className="diesel-selection-tags">
              {leadingTags.map((tag) => (
                <span className="diesel-selection-tag" key={tag}>
                  {tag}
                </span>
              ))}
            </div>

            <div className="cafe-detail-actions">
              {directionsHref ? (
                <a className="diesel-selection-primary" href={directionsHref} target="_blank" rel="noreferrer">
                  Directions
                </a>
              ) : null}
              <Link className="diesel-selection-secondary" href={`/cafes/${cafe.slug}#reviews`}>
                Reviews
              </Link>
            </div>

            <div className="cafe-detail-grid">
              <article className="cafe-detail-section">
                <h2>Address</h2>
                <p>{cafe.address}</p>
              </article>

              <article className="cafe-detail-section">
                <h2>Quick read</h2>
                <p>{cafe.summary}</p>
              </article>

              <article className="cafe-detail-section" id="reviews">
                <h2>What people mention</h2>
                {topTags.length > 0 ? (
                  <div className="diesel-selection-tags">
                    {topTags.map((tag) => (
                      <span className="diesel-selection-tag" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p>Structured review signals will show up here as more people leave feedback.</p>
                )}
              </article>

              <article className="cafe-detail-section">
                <h2>Popular drinks</h2>
                <p>{cafe.drinks.length > 0 ? cafe.drinks.join(", ") : "No drink trends yet."}</p>
              </article>

              <article className="cafe-detail-section">
                <h2>Roasters</h2>
                <p>{cafe.roasters.length > 0 ? cafe.roasters.join(", ") : "Roaster details coming soon."}</p>
              </article>

              <article className="cafe-detail-section">
                <h2>Recent reviews</h2>
                {recentReviews.length > 0 ? (
                  <div className="cafe-review-list">
                    {recentReviews.map((review) => (
                      <article className="cafe-review-card" key={review.id}>
                        <div className="cafe-review-head">
                          <strong>{review.rating.toFixed(1)}</strong>
                          <span>{review.drink ?? "Coffee"}</span>
                        </div>
                        <p>{review.note}</p>
                        {review.tags.length > 0 ? (
                          <div className="cafe-review-tags">
                            {review.tags.map((tag) => (
                              <span className="diesel-selection-tag" key={`${review.id}-${tag}`}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>
                ) : (
                  <p>Be the first to leave a review and help the next coffee run.</p>
                )}
              </article>

              <article className="cafe-detail-section">
                <h2>Good to know</h2>
                <p>
                  {cafe.website
                    ? "Check the cafe website before heading out for current hours, menu changes, or seasonal drinks."
                    : "Availability, menu focus, and opening hours can shift, so it is worth checking before making the trip."}
                </p>
              </article>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
