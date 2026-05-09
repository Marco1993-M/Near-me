import type { Metadata } from "next";
import { getFeaturedCafes } from "@/lib/cafes";
import { SavedCafesScreen } from "@/components/saved-cafes-screen";

export const metadata: Metadata = {
  title: "Saved Cafes",
  description:
    "A lightweight saved-cafes view for the spots you want to revisit quickly.",
  alternates: {
    canonical: "/top",
  },
};

export const revalidate = 300;

export default async function TopPage() {
  const cafes = await getFeaturedCafes();
  return <SavedCafesScreen cafes={cafes} />;
}
