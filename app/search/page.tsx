import type { Metadata } from "next";
import Link from "next/link";
import { getCityHighlights, getFeaturedCafes } from "@/lib/cafes";

export const metadata: Metadata = {
  title: "Search",
  description:
    "Search cafes, cities, neighborhoods, and roasters with a future-ready route structure for global coffee discovery.",
  alternates: {
    canonical: "/search",
  },
};

type SearchPageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q = "" } = await searchParams;
  const query = q.trim().toLowerCase();
  const [cafes, cities] = await Promise.all([getFeaturedCafes(), getCityHighlights()]);

  const filteredCafes = query
    ? cafes.filter((cafe) =>
        [cafe.name, cafe.city, ...cafe.roasters].some((value) =>
          value.toLowerCase().includes(query),
        ),
      )
    : cafes;

  const filteredCities = query
    ? cities.filter((city) => city.name.toLowerCase().includes(query))
    : cities;

  return (
    <main className="screen-stack">
      <section className="screen-map-header">
        <div className="app-map" aria-hidden="true">
          <div className="map-road" />
          <div className="map-road-secondary" />
          <span className="map-road-label one">Search anywhere</span>
          <span className="map-road-label two">Coffee route</span>
        </div>
        <div className="app-overlay">
          <Link className="floating-search-link" href={query ? `/search?q=${encodeURIComponent(q)}` : "/search"}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4.5 4.5" />
            </svg>
            <span>{q || "Search coffee shops..."}</span>
          </Link>
        </div>
      </section>

      <section className="screen-sheet sheet-grid">
        <article className="sheet-card">
          <h1 className="screen-title">Search</h1>
          <p className="screen-subtitle">
            {query
              ? `Showing live route results for "${q}".`
              : "Search by cafe, city, neighborhood, or roaster."}
          </p>
        </article>

        <article className="sheet-card">
          <h2>Cafes</h2>
          {filteredCafes.length > 0 ? (
            <ul className="route-list">
              {filteredCafes.slice(0, 6).map((cafe) => (
                <li className="route-item" key={cafe.id}>
                  <div>
                    <strong>{cafe.name}</strong>
                    <span>{cafe.city} · {cafe.summary}</span>
                  </div>
                  <Link href={`/cafes/${cafe.slug}`}>Open</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="screen-subtitle">
              {query ? "No cafes matched that search yet." : "No cafes are available to search right now."}
            </p>
          )}
        </article>

        <article className="sheet-card">
          <h2>Cities</h2>
          {filteredCities.length > 0 ? (
            <ul className="route-list">
              {filteredCities.slice(0, 6).map((city) => (
                <li className="route-item" key={city.slug}>
                  <div>
                    <strong>{city.name}</strong>
                    <span>{city.cafeCount} cafes tracked</span>
                  </div>
                  <Link href={`/cities/${city.slug}`}>Open</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="screen-subtitle">
              {query ? "No cities matched that search yet." : "City discovery will appear here as more cafes are indexed."}
            </p>
          )}
        </article>
      </section>
    </main>
  );
}
