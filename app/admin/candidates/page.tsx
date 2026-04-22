import { approveCandidate, ignoreCandidate } from "@/app/admin/candidates/actions";
import { isValidAdminToken } from "@/lib/admin";
import { CANONICAL_TABLES } from "@/lib/db-schema";
import { getSupabaseServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type CandidatePayload = {
  submission_type?: string;
  note?: string;
  latest_review?: {
    rating?: number;
    drink?: string | null;
    note?: string;
    tags?: string[];
    submitted_at?: string;
  };
  reviews?: Array<{
    rating?: number;
    drink?: string | null;
    note?: string;
    tags?: string[];
    submitted_at?: string;
  }>;
  promotion_candidate?: boolean;
};

type CandidatesPageProps = {
  searchParams: Promise<{
    token?: string;
    status?: string;
  }>;
};

function getStatusMessage(status?: string) {
  switch (status) {
    case "approved":
      return "Candidate approved and added to Near Me.";
    case "ignored":
      return "Candidate ignored.";
    case "already-approved":
      return "That place was already approved.";
    case "invalid-token":
      return "Invalid moderation token.";
    case "city-error":
      return "Could not create or find the city for that place.";
    case "match-error":
      return "Place created, but the source record could not be linked back cleanly.";
    case "approve-error":
      return "Could not approve that candidate.";
    case "ignore-error":
      return "Could not ignore that candidate.";
    default:
      return null;
  }
}

export default async function CandidatesPage({ searchParams }: CandidatesPageProps) {
  const { token = "", status } = await searchParams;
  const isAuthorized = isValidAdminToken(token);
  const statusMessage = getStatusMessage(status);

  if (!isAuthorized) {
    return (
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "2rem 1rem 4rem" }}>
        <h1 style={{ marginBottom: "0.75rem" }}>Near Me candidate queue</h1>
        <p style={{ color: "rgba(20,32,24,0.7)", lineHeight: 1.6 }}>
          Add your moderation token in the URL to open the private queue.
        </p>
        <p style={{ color: "rgba(20,32,24,0.7)", lineHeight: 1.6 }}>
          Example: <code>/admin/candidates?token=your-secret-token</code>
        </p>
      </main>
    );
  }

  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return (
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "2rem 1rem 4rem" }}>
        <h1>Near Me candidate queue</h1>
        <p>Supabase is not configured on the server.</p>
      </main>
    );
  }

  const [{ data: sourcePlaces }, { data: placeSources }] = await Promise.all([
    supabase
      .from(CANONICAL_TABLES.sourcePlaces)
      .select("id, created_at, raw_name, raw_address, raw_city, raw_country_code, latitude, longitude, website, payload, source_id, match_status, canonical_cafe_id")
      .eq("match_status", "unmatched")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from(CANONICAL_TABLES.placeSources).select("id, code, name"),
  ]);

  const sourceCodeById = new Map((placeSources ?? []).map((source) => [source.id, source.code]));
  const candidates = (sourcePlaces ?? []).filter((sourcePlace) => {
    const payload = (sourcePlace.payload ?? {}) as CandidatePayload;
    const sourceCode = sourceCodeById.get(sourcePlace.source_id);

    return (
      payload.promotion_candidate === true ||
      payload.submission_type === "user_add_shop" ||
      payload.submission_type === "fallback_first_review" ||
      sourceCode === "user-submissions"
    );
  });

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "2rem 1rem 4rem" }}>
      <div style={{ display: "grid", gap: "0.35rem", marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0 }}>Near Me candidate queue</h1>
        <p style={{ margin: 0, color: "rgba(20,32,24,0.68)", lineHeight: 1.6 }}>
          Review user-submitted and first-reviewed places, then promote the good ones into the official Near Me map.
        </p>
        {statusMessage ? (
          <p
            style={{
              margin: "0.25rem 0 0",
              padding: "0.8rem 0.95rem",
              borderRadius: 16,
              background: "rgba(199,245,211,0.35)",
              color: "#142018",
            }}
          >
            {statusMessage}
          </p>
        ) : null}
      </div>

      {candidates.length === 0 ? (
        <div
          style={{
            padding: "1.2rem",
            borderRadius: 20,
            border: "1px solid rgba(20,32,24,0.12)",
            background: "rgba(255,255,252,0.74)",
          }}
        >
          No pending candidates right now.
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {candidates.map((candidate) => {
            const payload = (candidate.payload ?? {}) as CandidatePayload;
            const latestReview =
              payload.latest_review ??
              (Array.isArray(payload.reviews) && payload.reviews.length > 0 ? payload.reviews[payload.reviews.length - 1] : null);
            const sourceCode = sourceCodeById.get(candidate.source_id) ?? "unknown";
            const note = latestReview?.note ?? payload.note ?? "";
            const tags = latestReview?.tags ?? [];

            return (
              <section
                key={candidate.id}
                style={{
                  display: "grid",
                  gap: "0.95rem",
                  padding: "1.05rem",
                  borderRadius: 24,
                  border: "1px solid rgba(20,32,24,0.12)",
                  background: "rgba(255,255,252,0.82)",
                  boxShadow: "0 18px 36px rgba(20,32,24,0.08)",
                }}
              >
                <div style={{ display: "grid", gap: "0.35rem" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", alignItems: "center" }}>
                    <strong style={{ fontSize: "1.02rem" }}>{candidate.raw_name}</strong>
                    <span
                      style={{
                        padding: "0.2rem 0.55rem",
                        borderRadius: 999,
                        background: "rgba(20,32,24,0.06)",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {sourceCode}
                    </span>
                  </div>
                  <span style={{ color: "rgba(20,32,24,0.62)", fontSize: "0.9rem" }}>
                    {[candidate.raw_address, candidate.raw_city, candidate.raw_country_code].filter(Boolean).join(" · ")}
                  </span>
                  {latestReview ? (
                    <div style={{ display: "grid", gap: "0.3rem", marginTop: "0.35rem" }}>
                      <span style={{ color: "rgba(20,32,24,0.5)", fontSize: "0.76rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        First review
                      </span>
                      <strong style={{ fontSize: "0.95rem" }}>
                        {latestReview.rating ? `${latestReview.rating}/10` : "New"}{latestReview.drink ? ` · ${latestReview.drink}` : ""}
                      </strong>
                      {note ? <p style={{ margin: 0, color: "rgba(20,32,24,0.74)", lineHeight: 1.55 }}>{note}</p> : null}
                      {tags.length > 0 ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                          {tags.map((tag) => (
                            <span
                              key={tag}
                              style={{
                                padding: "0.24rem 0.55rem",
                                borderRadius: 999,
                                background: "rgba(199,245,211,0.42)",
                                fontSize: "0.76rem",
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <form action={approveCandidate} style={{ display: "grid", gap: "0.75rem" }}>
                  <input type="hidden" name="token" value={token} />
                  <input type="hidden" name="sourcePlaceId" value={candidate.id} />

                  <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                    <label style={{ display: "grid", gap: "0.32rem" }}>
                      <span>Name</span>
                      <input name="name" defaultValue={candidate.raw_name ?? ""} style={{ padding: "0.72rem 0.82rem", borderRadius: 14, border: "1px solid rgba(20,32,24,0.14)" }} />
                    </label>
                    <label style={{ display: "grid", gap: "0.32rem" }}>
                      <span>City</span>
                      <input name="city" defaultValue={candidate.raw_city ?? ""} style={{ padding: "0.72rem 0.82rem", borderRadius: 14, border: "1px solid rgba(20,32,24,0.14)" }} />
                    </label>
                    <label style={{ display: "grid", gap: "0.32rem" }}>
                      <span>Country</span>
                      <input name="countryCode" defaultValue={candidate.raw_country_code ?? "ZA"} style={{ padding: "0.72rem 0.82rem", borderRadius: 14, border: "1px solid rgba(20,32,24,0.14)" }} />
                    </label>
                    <label style={{ display: "grid", gap: "0.32rem" }}>
                      <span>Latitude</span>
                      <input name="latitude" defaultValue={candidate.latitude ?? ""} style={{ padding: "0.72rem 0.82rem", borderRadius: 14, border: "1px solid rgba(20,32,24,0.14)" }} />
                    </label>
                    <label style={{ display: "grid", gap: "0.32rem" }}>
                      <span>Longitude</span>
                      <input name="longitude" defaultValue={candidate.longitude ?? ""} style={{ padding: "0.72rem 0.82rem", borderRadius: 14, border: "1px solid rgba(20,32,24,0.14)" }} />
                    </label>
                    <label style={{ display: "grid", gap: "0.32rem" }}>
                      <span>Website</span>
                      <input name="website" defaultValue={candidate.website ?? ""} style={{ padding: "0.72rem 0.82rem", borderRadius: 14, border: "1px solid rgba(20,32,24,0.14)" }} />
                    </label>
                  </div>

                  <label style={{ display: "grid", gap: "0.32rem" }}>
                    <span>Address</span>
                    <input name="address" defaultValue={candidate.raw_address ?? ""} style={{ padding: "0.72rem 0.82rem", borderRadius: 14, border: "1px solid rgba(20,32,24,0.14)" }} />
                  </label>

                  <label style={{ display: "grid", gap: "0.32rem" }}>
                    <span>Summary / moderation note</span>
                    <textarea
                      name="note"
                      defaultValue={note}
                      rows={3}
                      style={{ padding: "0.78rem 0.85rem", borderRadius: 16, border: "1px solid rgba(20,32,24,0.14)", resize: "vertical" }}
                    />
                  </label>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem" }}>
                    <button
                      type="submit"
                      style={{
                        padding: "0.85rem 1rem",
                        borderRadius: 999,
                        border: 0,
                        background: "#142018",
                        color: "#fffffc",
                        fontWeight: 700,
                      }}
                    >
                      Approve into Near Me
                    </button>
                  </div>
                </form>

                <form action={ignoreCandidate}>
                  <input type="hidden" name="token" value={token} />
                  <input type="hidden" name="sourcePlaceId" value={candidate.id} />
                  <button
                    type="submit"
                    style={{
                      padding: "0.72rem 0.95rem",
                      borderRadius: 999,
                      border: "1px solid rgba(20,32,24,0.14)",
                      background: "transparent",
                      color: "rgba(20,32,24,0.72)",
                      fontWeight: 700,
                    }}
                  >
                    Ignore candidate
                  </button>
                </form>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
