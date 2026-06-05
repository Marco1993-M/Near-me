import type { Metadata } from "next";
import Link from "next/link";
import { getCafeDecisionGuide } from "@/lib/cafe-insights";
import { getTasteGuideBySlug, getTasteGuideStaticParams } from "@/lib/cafes";

export const revalidate = 21600;

type GuidePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  return getTasteGuideStaticParams();
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getTasteGuideBySlug(slug);

  return {
    title: guide ? guide.title : "Taste-led guide",
    description: guide?.description ?? "Specialty coffee guide built from Near Me cafe data.",
    alternates: {
      canonical: `/guides/${slug}`,
    },
  };
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { slug } = await params;
  const guide = await getTasteGuideBySlug(slug);

  if (!guide) {
    return (
      <main className="section-stack">
        <section className="panel section-card">
          <h1>Guide not found</h1>
          <p>This guide does not exist yet, but the Near Me guide layer is growing.</p>
          <Link className="guide-link" href="/guides">
            Back to guides
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="section-stack">
      <section className="panel section-card">
        <span className="guide-eyebrow">{guide.eyebrow}</span>
        <h1>{guide.title}</h1>
        <p>{guide.intro}</p>
        <div className="tag-row">
          <span className="tag">{guide.cafes.length} matching cafes</span>
          <span className="tag">Near Me editorial layer</span>
        </div>
      </section>

      <section className="panel section-card">
        <h2>Why this guide exists</h2>
        <p>{guide.description}</p>
      </section>

      <section className="panel section-card">
        <h2>Places to start</h2>
        <ul className="route-list">
          {guide.cafes.length > 0 ? (
            guide.cafes.slice(0, 18).map((cafe) => {
              const decisionGuide = getCafeDecisionGuide(cafe);
              return (
                <li className="route-item route-item-rich" key={cafe.id}>
                  <div>
                    <strong>{cafe.name}</strong>
                    <span>{cafe.city}</span>
                    <span>{decisionGuide.goIfHeadline}</span>
                    <span>{decisionGuide.confidenceRead} · Order {decisionGuide.order}</span>
                  </div>
                  <Link href={`/cafes/${cafe.slug}`}>Open</Link>
                </li>
              );
            })
          ) : (
            <li className="route-item">
              <div>
                <strong>No cafes surfaced yet</strong>
                <span>We have not surfaced enough cafes for this guide yet.</span>
              </div>
            </li>
          )}
        </ul>
      </section>
    </main>
  );
}
