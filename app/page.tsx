import { HomeDiscoveryScreen } from "@/components/home-discovery-screen";
import { getFeaturedCafes } from "@/lib/cafes";

export const revalidate = 300;

export default async function HomePage() {
  const featuredCafes = await getFeaturedCafes();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Near Me Cafe",
    url: "https://www.near-me.cafe",
    description:
      "Find standout local coffee shops anywhere in the world with low-friction discovery, trusted details, and traveler-friendly search.",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://www.near-me.cafe/search?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <main className="map-page-root">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <HomeDiscoveryScreen cafes={featuredCafes} />
    </main>
  );
}
