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
    <main className="screen-stack">
      <section className="screen-map-header">
        <div className="app-map" aria-hidden="true">
          <div className="map-road" />
          <div className="map-road-secondary" />
          <span className="map-road-label one">Near Me guides</span>
          <span className="map-road-label two">Taste-led discovery</span>
        </div>
        <div className="app-overlay">
          <Link className="floating-search-link" href="/guides">
            <span>Near Me</span>
            <strong>Taste-led coffee guides</strong>
          </Link>
        </div>
      </section>

      <section className="screen-sheet sheet-grid">
        <article className="sheet-card">
          <h1 className="screen-title">Taste-led coffee guides</h1>
          <p className="screen-subtitle">
            A growing set of Near Me guide pages built from cafe data, shaped around taste,
            trust, and how you actually like to drink.
          </p>
          <div className="tag-row">
            <span className="tag">{guides.length} guides live</span>
            <span className="tag">Specialty-first</span>
            <span className="tag">Built from cafe signals</span>
          </div>
        </article>

        <section className="guide-grid">
          {guides.map((guide) => (
            <article className="sheet-card guide-card" key={guide.slug}>
              <span className="guide-eyebrow">{guide.eyebrow}</span>
              <h2>{guide.title}</h2>
              <p>{guide.description}</p>
              <Link className="guide-link" href={`/guides/${guide.slug}`}>
                Open guide
              </Link>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
