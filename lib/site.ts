import type { Metadata } from "next";

export const siteConfig = {
  name: "Near Me Cafe",
  shortName: "Near Me",
  description:
    "Find standout local coffee shops anywhere in the world with low-friction discovery, trusted details, and traveler-friendly search.",
  url: "https://www.near-me.cafe",
  locale: "en_ZA",
  keywords: [
    "coffee shops near me",
    "best cafes",
    "specialty coffee",
    "coffee guide",
    "travel coffee app",
    "best local coffee spots",
  ],
};

export const defaultMetadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} | Find Great Coffee Anywhere`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  applicationName: siteConfig.shortName,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: siteConfig.url,
    title: `${siteConfig.name} | Find Great Coffee Anywhere`,
    description: siteConfig.description,
    siteName: siteConfig.name,
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} | Find Great Coffee Anywhere`,
    description: siteConfig.description,
  },
  category: "food",
};
