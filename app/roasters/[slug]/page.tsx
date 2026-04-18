import type { Metadata } from "next";

type RoasterPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: RoasterPageProps): Promise<Metadata> {
  const { slug } = await params;
  const roasterName = slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return {
    title: `${roasterName} Cafes`,
    description: `Explore cafes connected to ${roasterName} in a future roaster discovery experience.`,
    alternates: {
      canonical: `/roasters/${slug}`,
    },
  };
}

export default async function RoasterPage({ params }: RoasterPageProps) {
  const { slug } = await params;

  return (
    <main className="section-stack">
      <section className="panel section-card">
        <h1>{slug.replaceAll("-", " ")}</h1>
        <p>
          Roaster pages will support another useful discovery entry point once the data
          relationships are cleaned up and normalized.
        </p>
      </section>
    </main>
  );
}
