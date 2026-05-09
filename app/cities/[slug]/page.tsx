import type { Metadata } from "next";
import { getCityHighlights, getFeaturedCafes } from "@/lib/cafes";

export const revalidate = 300;

type CityPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

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
    getFeaturedCafes(),
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

  return (
    <main className="section-stack">
      <section className="panel section-card">
        <h1>{cityName}</h1>
        <p>
          City pages will become a major SEO and traveler surface in V2. They support
          destination-first discovery when users search manually instead of sharing location.
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

      <section className="panel section-card">
        <h2>Cafes currently surfaced</h2>
        <ul className="route-list">
          {matchingCafes.length > 0 ? (
            matchingCafes.map((cafe) => (
              <li className="route-item" key={cafe.id}>
                <div>
                  <strong>{cafe.name}</strong>
                  <span>{cafe.summary}</span>
                </div>
                <a href={`/cafes/${cafe.slug}`}>Open</a>
              </li>
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
