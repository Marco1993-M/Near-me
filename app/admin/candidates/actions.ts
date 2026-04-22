"use server";

import { redirect } from "next/navigation";
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

  redirectBack(token, "approved");
}
