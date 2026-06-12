"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import {
  CAFE_TRUST_SIGNALS_CACHE_TAG,
  CANONICAL_CAFES_COLD_CACHE_TAG,
  CANONICAL_CAFES_HOT_CACHE_TAG,
} from "@/lib/cafes";
import { CANONICAL_TABLES } from "@/lib/db-schema";
import { isValidAdminToken } from "@/lib/admin";
import { getSupabaseServerClient } from "@/lib/supabase";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

type CandidateReviewPayload = {
  rating?: number;
  drink?: string | null;
  note?: string;
  tags?: string[];
  submitted_at?: string;
  anon_id?: string | null;
};

type SourcePlacePayload = {
  latest_review?: CandidateReviewPayload | null;
  reviews?: CandidateReviewPayload[];
  approved_at?: string;
  approved_via?: string;
};

function normalizeCandidateReviews(payload: SourcePlacePayload | null | undefined) {
  const reviews = Array.isArray(payload?.reviews) ? payload.reviews : [];
  const fallbackLatest = payload?.latest_review ? [payload.latest_review] : [];
  const candidates = [...reviews, ...fallbackLatest];
  const seen = new Set<string>();

  return candidates.filter((review): review is Required<Pick<CandidateReviewPayload, "rating" | "note">> &
    CandidateReviewPayload => {
    const rating = Number(review?.rating);
    const note = review?.note?.trim();

    if (!Number.isFinite(rating) || rating < 1 || rating > 10 || !note) {
      return false;
    }

    const key = [
      rating,
      review?.drink?.trim()?.toLowerCase() ?? "",
      note.toLowerCase(),
      review?.submitted_at ?? "",
    ].join("__");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function normalizeReviewTags(tags: string[] | undefined) {
  return Array.from(
    new Set(
      (tags ?? [])
        .map((tag) => tag.trim().toLowerCase().replace(/\s+/g, "-"))
        .filter(Boolean),
    ),
  ).slice(0, 5);
}

async function resolveUniqueCafeSlug(
  supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>,
  name: string,
  citySlug: string,
) {
  const baseSlug = slugify(name) || "cafe";
  const candidates = [baseSlug, `${baseSlug}-${citySlug}`];

  for (const candidate of candidates) {
    const { data } = await supabase
      .from(CANONICAL_TABLES.cafes)
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (!data) {
      return candidate;
    }
  }

  return `${baseSlug}-${Date.now().toString().slice(-6)}`;
}

function redirectBack(token: string, status: string): never {
  return redirect(`/admin/candidates?token=${encodeURIComponent(token)}&status=${encodeURIComponent(status)}`);
}

export async function ignoreCandidate(formData: FormData) {
  const token = getString(formData, "token");
  const sourcePlaceId = getString(formData, "sourcePlaceId");

  if (!isValidAdminToken(token)) {
    redirect("/admin/candidates?status=invalid-token");
  }

  const supabase = getSupabaseServerClient();
  if (!supabase || !sourcePlaceId) {
    redirectBack(token, "ignore-error");
  }
  const adminSupabase = supabase;

  const { error } = await adminSupabase
    .from(CANONICAL_TABLES.sourcePlaces)
    .update({ match_status: "ignored" })
    .eq("id", sourcePlaceId);

  if (error) {
    redirectBack(token, "ignore-error");
  }

  redirectBack(token, "ignored");
}

export async function approveCandidate(formData: FormData) {
  const token = getString(formData, "token");
  const sourcePlaceId = getString(formData, "sourcePlaceId");

  if (!isValidAdminToken(token)) {
    redirect("/admin/candidates?status=invalid-token");
  }

  const supabase = getSupabaseServerClient();
  if (!supabase || !sourcePlaceId) {
    redirectBack(token, "approve-error");
  }
  const adminSupabase = supabase;

  const { data: sourcePlace, error: sourcePlaceError } = await adminSupabase
    .from(CANONICAL_TABLES.sourcePlaces)
    .select("id, canonical_cafe_id, raw_name, raw_address, raw_city, raw_country_code, latitude, longitude, payload")
    .eq("id", sourcePlaceId)
    .maybeSingle();

  if (sourcePlaceError || !sourcePlace) {
    redirectBack(token, "approve-error");
  }

  if (sourcePlace.canonical_cafe_id) {
    redirectBack(token, "already-approved");
  }

  const name = getString(formData, "name") || sourcePlace.raw_name || "Untitled cafe";
  const cityName = getString(formData, "city") || sourcePlace.raw_city || "Unknown City";
  const citySlug = slugify(cityName) || "unknown-city";
  const countryCode = (getString(formData, "countryCode") || sourcePlace.raw_country_code || "ZA").toUpperCase();
  const address = getString(formData, "address") || sourcePlace.raw_address || cityName;
  const note = getString(formData, "note");
  const latitudeString = getString(formData, "latitude");
  const longitudeString = getString(formData, "longitude");
  const latitude = Number.isFinite(Number(latitudeString))
    ? Number(latitudeString)
    : typeof sourcePlace.latitude === "number"
      ? sourcePlace.latitude
      : null;
  const longitude = Number.isFinite(Number(longitudeString))
    ? Number(longitudeString)
    : typeof sourcePlace.longitude === "number"
      ? sourcePlace.longitude
      : null;

  const { data: cityRow, error: cityError } = await adminSupabase
    .from(CANONICAL_TABLES.cities)
    .upsert(
      [{ slug: citySlug, name: cityName, country_code: countryCode }],
      { onConflict: "slug" },
    )
    .select("id")
    .single();

  if (cityError || !cityRow?.id) {
    redirectBack(token, "city-error");
  }

  const cafeSlug = await resolveUniqueCafeSlug(adminSupabase, name, citySlug);
  const { data: cafeRow, error: cafeError } = await adminSupabase
    .from(CANONICAL_TABLES.cafes)
    .insert([
      {
        slug: cafeSlug,
        name,
        city_id: cityRow.id,
        country_code: countryCode,
        address_line1: address,
        latitude,
        longitude,
        summary: note || null,
        status: "active",
      },
    ])
    .select("id")
    .single();

  if (cafeError || !cafeRow?.id) {
    redirectBack(token, "approve-error");
  }

  const candidatePayload =
    sourcePlace.payload && typeof sourcePlace.payload === "object"
      ? (sourcePlace.payload as SourcePlacePayload)
      : null;
  const candidateReviews = normalizeCandidateReviews(candidatePayload);

  for (const review of candidateReviews) {
    const { data: insertedReview, error: reviewInsertError } = await adminSupabase
      .from(CANONICAL_TABLES.reviews)
      .insert([
        {
          cafe_id: cafeRow.id,
          rating: Number(review.rating),
          note: review.note.trim(),
          drink: review.drink?.trim() || null,
          anon_id: review.anon_id?.trim() || "candidate-migration",
          status: "approved",
          user_id: null,
          created_at: review.submitted_at || undefined,
        },
      ])
      .select("id")
      .single();

    if (reviewInsertError || !insertedReview?.id) {
      console.error("[admin/candidates] Failed to migrate candidate review.", reviewInsertError);
      continue;
    }

    const tags = normalizeReviewTags(review.tags);
    if (tags.length === 0) {
      continue;
    }

    const { error: tagInsertError } = await adminSupabase.from(CANONICAL_TABLES.reviewTags).insert(
      tags.map((tag) => ({
        review_id: insertedReview.id,
        tag,
      })),
    );

    if (tagInsertError) {
      console.error("[admin/candidates] Failed to migrate candidate review tags.", tagInsertError);
    }
  }

  const nextPayload =
    sourcePlace.payload && typeof sourcePlace.payload === "object"
      ? {
          ...sourcePlace.payload,
          approved_at: new Date().toISOString(),
          approved_via: "admin-candidates",
        }
      : {
          approved_at: new Date().toISOString(),
          approved_via: "admin-candidates",
        };

  const { error: updateError } = await adminSupabase
    .from(CANONICAL_TABLES.sourcePlaces)
    .update({
      canonical_cafe_id: cafeRow.id,
      match_status: "matched",
      payload: nextPayload,
    })
    .eq("id", sourcePlaceId);

  if (updateError) {
    redirectBack(token, "match-error");
  }

  revalidatePath("/");
  revalidatePath("/guides");
  revalidatePath(`/cafes/${cafeSlug}`);
  revalidatePath(`/cities/${citySlug}`);
  revalidateTag(CANONICAL_CAFES_HOT_CACHE_TAG, "max");
  revalidateTag(CANONICAL_CAFES_COLD_CACHE_TAG, "max");
  revalidateTag(CAFE_TRUST_SIGNALS_CACHE_TAG, "max");

  redirectBack(token, "approved");
}
