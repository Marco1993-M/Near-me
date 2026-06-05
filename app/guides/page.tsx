import type { Metadata } from "next";
import Link from "next/link";
import { getTasteGuideSummaries } from "@/lib/cafes";

export const metadata: Metadata = {
  title: "Taste-led coffee guides",
  description:
    "Editorial-style specialty coffee guides built from Near Me cafe data, shaped around taste, trust, and how you like to drink.",
  alternates: {
    canonical: "/guides",
  },
};

export const revalidate = 21600;

export default function GuidesPage() {
  const guides = getTasteGuideSummaries();

  return (
    <main className="section-stack">
      <section className="panel section-card">
        <h1>Taste-led coffee guides</h1>
        <p>
          A growing set of specialty coffee guide pages built from Near Me data, shaped
          around taste, trust, and how you actually like to drink.
        </p>
        <div className="tag-row">
          <span className="tag">{guides.length} guides live</span>
          <span className="tag">Specialty-first</span>
          <span className="tag">Built from cafe signals</span>
        </div>
      </section>

      <section className="guide-grid">
        {guides.map((guide) => (
          <article className="panel section-card guide-card" key={guide.slug}>
            <span className="guide-eyebrow">{guide.eyebrow}</span>
            <h2>{guide.title}</h2>
            <p>{guide.description}</p>
            <Link className="guide-link" href={`/guides/${guide.slug}`}>
              Open guide
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
