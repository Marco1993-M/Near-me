import type { Metadata } from "next";
import Link from "next/link";
import { getCafeDecisionGuide } from "@/lib/cafe-insights";
import { getCityHighlights, getCityStaticParams, getColdCafes, getTasteGuideSummaries } from "@/lib/cafes";

export const revalidate = 21600;

type CityPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  return getCityStaticParams();
}

export async function generateMetadata({
  params,
}: CityPageProps): Promise<Metadata> {
  const { slug } = await params;
  const cityName = slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return {
    title: `${cityName} Cafes`,
    description: `Find top coffee spots in ${cityName} with traveler-friendly city discovery and future SEO-ready collections.`,
    alternates: {
      canonical: `/cities/${slug}`,
    },
  };
}

export default async function CityPage({ params }: CityPageProps) {
  const { slug } = await params;
  const [cityHighlights, featuredCafes] = await Promise.all([
    getCityHighlights(),
    getColdCafes(),
  ]);
  const cityHighlight = cityHighlights.find((city) => city.slug === slug);
  const cityName =
    cityHighlight?.name ??
    slug
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  const matchingCafes = featuredCafes.filter(
    (cafe) => cafe.city.toLowerCase().replace(/\s+/g, "-") === slug,
  );
  const rankedByRating = [...matchingCafes].sort(
    (left, right) =>
      right.reviewSummary.averageRating - left.reviewSummary.averageRating ||
      right.reviewSummary.reviewCount - left.reviewSummary.reviewCount,
  );
  const cityGuideSpots = [
    rankedByRating[0] ?? null,
    matchingCafes.find((cafe) => cafe.tags.includes("Roaster-led")) ?? null,
    matchingCafes.find((cafe) => cafe.tags.includes("Quiet")) ?? null,
    matchingCafes.find((cafe) => cafe.drinks.some((drink) => /cortado|flat white|espresso/i.test(drink))) ?? null,
  ].filter((cafe, index, cafes): cafe is NonNullable<typeof cafe> => Boolean(cafe) && cafes.findIndex((item) => item?.id === cafe?.id) === index);
  const tasteGuides = getTasteGuideSummaries().slice(0, 3);

  return (
    <main className="section-stack">
      <section className="panel section-card">
        <h1>{cityName}</h1>
        <p>
          A specialty-first coffee guide for {cityName}, built to help you skip generic listings
          and make a smarter first coffee stop.
        </p>
        {cityHighlight ? (
          <div className="tag-row">
            <span className="tag">{cityHighlight.cafeCount} cafes tracked</span>
            {cityHighlight.topRatedCafe ? (
              <span className="tag">Top rated: {cityHighlight.topRatedCafe}</span>
            ) : null}
          </div>
        ) : null}
      </section>

      {cityGuideSpots.length > 0 ? (
        <section className="panel section-card">
          <h2>How we would start in {cityName}</h2>
          <ul className="route-list">
            {cityGuideSpots.map((cafe) => {
              const guide = getCafeDecisionGuide(cafe);

              return (
                <li className="route-item" key={cafe.id}>
                  <div>
                    <strong>{cafe.name}</strong>
                    <span>{guide.goIfHeadline}</span>
                    <span>{guide.confidenceRead} · {guide.order}</span>
                  </div>
                  <Link href={`/cafes/${cafe.slug}`}>Open</Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="panel section-card">
        <h2>Taste-led guides</h2>
        <p>
          Not sure how to start in {cityName}? These Near Me guides sort cafes by drink style,
          trust, and the kind of coffee experience you want.
        </p>
        <ul className="route-list">
          {tasteGuides.map((guide) => (
            <li className="route-item" key={guide.slug}>
              <div>
                <strong>{guide.title}</strong>
                <span>{guide.description}</span>
              </div>
              <Link href={`/guides/${guide.slug}`}>Open</Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel section-card">
        <h2>Specialty cafes in {cityName}</h2>
        <ul className="route-list">
          {matchingCafes.length > 0 ? (
            matchingCafes.map((cafe) => (
              (() => {
                const guide = getCafeDecisionGuide(cafe);

                return (
                  <li className="route-item" key={cafe.id}>
                    <div>
                      <strong>{cafe.name}</strong>
                      <span>{guide.goIfHeadline}</span>
                      <span>
                        {guide.confidenceRead} · {guide.order}
                      </span>
                    </div>
                    <Link href={`/cafes/${cafe.slug}`}>Open</Link>
                  </li>
                );
              })()
            ))
          ) : (
            <li className="route-item">
              <div>
                <strong>No cafes surfaced yet</strong>
                <span>
                  We have not surfaced any cafes for this city yet. Try the map or search while the index grows.
                </span>
              </div>
            </li>
          )}
        </ul>
      </section>
    </main>
  );
}
