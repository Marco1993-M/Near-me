import type { MetadataRoute } from "next";
import { getCafeStaticParams, getCityStaticParams, getTasteGuideStaticParams } from "@/lib/cafes";
import { siteConfig } from "@/lib/site";

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cafeParams, cityParams, guideParams] = await Promise.all([
    getCafeStaticParams(),
    getCityStaticParams(),
    getTasteGuideStaticParams(),
  ]);

  const staticRoutes = ["", "/search", "/top", "/guides"].map((route) => ({
    url: `${siteConfig.url}${route}`,
    changeFrequency: (route === "" ? "daily" : "weekly") as "daily" | "weekly",
    priority: route === "" ? 1 : 0.8,
  }));

  const cityRoutes = cityParams.map((city) => ({
    url: `${siteConfig.url}/cities/${city.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.72,
  }));

  const cafeRoutes = cafeParams.map((cafe) => ({
    url: `${siteConfig.url}/cafes/${cafe.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.68,
  }));

  const guideRoutes = guideParams.map((guide) => ({
    url: `${siteConfig.url}/guides/${guide.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.74,
  }));

  return [...staticRoutes, ...cityRoutes, ...guideRoutes, ...cafeRoutes];
}
