import { NextResponse } from "next/server";
import { CANONICAL_TABLES } from "@/lib/db-schema";
import { getSupabaseServerClient } from "@/lib/supabase";

type FallbackReviewPayload = {
  place?: {
    id?: string;
    source?: string;
    name?: string;
    address?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    website?: string | null;
  };
  rating?: number;
  drink?: string | null;
  note?: string;
  tags?: string[];
  anonId?: string;
};

function normalizeTags(tags: string[] | undefined) {
  return (tags ?? [])
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 5);
}

export async function POST(request: Request) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const payload = (await request.json()) as FallbackReviewPayload;
  const place = payload.place;
  const sourceCode = place?.source?.trim() || "osm-overpass";
  const externalId = place?.id?.trim();
  const name = place?.name?.trim();
  const address = place?.address?.trim() || null;
  const city = place?.city?.trim() || null;
  const website = place?.website?.trim() || null;
  const note = payload.note?.trim() || "";
  const drink = payload.drink?.trim() || null;
  const rating = Number(payload.rating);
  const anonId = payload.anonId?.trim() || null;
  const latitude = typeof place?.latitude === "number" ? place.latitude : null;
  const longitude = typeof place?.longitude === "number" ? place.longitude : null;
  const tags = normalizeTags(payload.tags);

  if (!externalId || !name) {
    return NextResponse.json({ error: "Place details are required." }, { status: 400 });
  }

  if (!Number.isFinite(rating) || rating < 1 || rating > 10) {
    return NextResponse.json({ error: "A score between 1 and 10 is required." }, { status: 400 });
  }

  if (!drink) {
    return NextResponse.json({ error: "Pick what you ordered first." }, { status: 400 });
  }

  if (note.length < 12) {
    return NextResponse.json({ error: "Add a short useful note first." }, { status: 400 });
  }

  const { data: existingSourceRow, error: existingSourceError } = await supabase
    .from(CANONICAL_TABLES.placeSources)
    .select("id")
    .eq("code", sourceCode)
    .maybeSingle();

  if (existingSourceError) {
    console.error("[fallback-reviews] Failed to look up place source.", existingSourceError);
    return NextResponse.json({ error: "Could not prepare review source." }, { status: 500 });
  }

  let sourceRow = existingSourceRow;

  if (!sourceRow?.id) {
    const { data: insertedSourceRow, error: insertSourceError } = await supabase
      .from(CANONICAL_TABLES.placeSources)
      .insert([{ code: sourceCode, name: "Fallback nearby options" }])
      .select("id")
      .single();

    if (insertSourceError || !insertedSourceRow?.id) {
      console.error("[fallback-reviews] Failed to create place source.", insertSourceError);
      return NextResponse.json({ error: "Could not prepare review source." }, { status: 500 });
    }

    sourceRow = insertedSourceRow;
  }

  const reviewEntry = {
    anon_id: anonId,
    rating,
    drink,
    note,
    tags,
    submitted_at: new Date().toISOString(),
  };

  const { data: existingSourcePlace, error: existingError } = await supabase
    .from(CANONICAL_TABLES.sourcePlaces)
    .select("id, payload")
    .eq("source_id", sourceRow.id)
    .eq("external_id", externalId)
    .maybeSingle();

  if (existingError) {
    console.error("[fallback-reviews] Failed to load existing nearby option.", existingError);
    return NextResponse.json({ error: "Could not load existing nearby option." }, { status: 500 });
  }

  const existingPayload =
    existingSourcePlace?.payload && typeof existingSourcePlace.payload === "object"
      ? existingSourcePlace.payload
      : {};
  const existingReviews = Array.isArray((existingPayload as { reviews?: unknown[] }).reviews)
    ? ((existingPayload as { reviews?: unknown[] }).reviews ?? [])
    : [];

  const nextPayload = {
    ...existingPayload,
    promotion_candidate: true,
    submission_type: "fallback_first_review",
    latest_review: reviewEntry,
    reviews: [...existingReviews, reviewEntry],
  };

  const upsertPayload = {
    source_id: sourceRow.id,
    external_id: externalId,
    raw_name: name,
    raw_address: address,
    raw_city: city,
    raw_country_code: "ZA",
    latitude,
    longitude,
    website,
    payload: nextPayload,
    match_status: "unmatched",
  };

  const sourcePlaceMutation = existingSourcePlace?.id
    ? supabase
        .from(CANONICAL_TABLES.sourcePlaces)
        .update(upsertPayload)
        .eq("id", existingSourcePlace.id)
    : supabase.from(CANONICAL_TABLES.sourcePlaces).insert([upsertPayload]);

  const { error: upsertError } = await sourcePlaceMutation;

  if (upsertError) {
    console.error("[fallback-reviews] Failed to save fallback review.", upsertError);
    return NextResponse.json({ error: "Could not save fallback review." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
