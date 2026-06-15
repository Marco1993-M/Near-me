import { HomeDiscoveryScreen } from "@/components/home-discovery-screen";
import { getCafeBySlug, getFeaturedCafes } from "@/lib/cafes";

export const revalidate = 3600;

type HomePageProps = {
  searchParams: Promise<{
    intent?: string;
    open?: string;
    review?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const { intent, open, review } = await searchParams;
  const [featuredCafes, reviewCafe] = await Promise.all([
    getFeaturedCafes(),
    review ? getCafeBySlug(review) : Promise.resolve(null),
  ]);
  const cafes =
    reviewCafe && !featuredCafes.some((cafe) => cafe.id === reviewCafe.id)
      ? [reviewCafe, ...featuredCafes]
      : featuredCafes;
  const openTasteSetup = intent === "taste" || open === "taste";

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
      <HomeDiscoveryScreen cafes={cafes} openTasteSetup={openTasteSetup} initialReviewCafeSlug={review} />
    </main>
  );
}
