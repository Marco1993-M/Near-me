import type { MetadataRoute } from "next";
import { getCityHighlights, getFeaturedCafes } from "@/lib/cafes";
import { siteConfig } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cafes, cityHighlights] = await Promise.all([
    getFeaturedCafes(),
    getCityHighlights(),
  ]);

  const staticRoutes = ["", "/search", "/top"].map((route) => ({
    url: `${siteConfig.url}${route}`,
    lastModified: new Date(),
    changeFrequency: (route === "" ? "daily" : "weekly") as "daily" | "weekly",
    priority: route === "" ? 1 : 0.8,
  }));

  const cityRoutes = cityHighlights.map((city) => ({
    url: `${siteConfig.url}/cities/${city.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.72,
  }));

  const cafeRoutes = cafes.map((cafe) => ({
    url: `${siteConfig.url}/cafes/${cafe.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.68,
  }));

  return [...staticRoutes, ...cityRoutes, ...cafeRoutes];
}
