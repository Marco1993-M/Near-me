import type { MetadataRoute } from "next";
import { getCafeStaticParams, getCityStaticParams } from "@/lib/cafes";
import { siteConfig } from "@/lib/site";

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cafeParams, cityParams] = await Promise.all([
    getCafeStaticParams(),
    getCityStaticParams(),
  ]);

  const staticRoutes = ["", "/search", "/top"].map((route) => ({
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

  return [...staticRoutes, ...cityRoutes, ...cafeRoutes];
}
