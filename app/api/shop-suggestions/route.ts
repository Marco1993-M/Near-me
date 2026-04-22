import { NextResponse } from "next/server";
import { CANONICAL_TABLES } from "@/lib/db-schema";
import { getSupabaseServerClient } from "@/lib/supabase";

type SuggestionPayload = {
  name?: string;
  area?: string;
  note?: string;
  latitude?: number | null;
  longitude?: number | null;
};

export async function POST(request: Request) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const payload = (await request.json()) as SuggestionPayload;
  const name = payload.name?.trim();
  const area = payload.area?.trim() ?? "";
  const note = payload.note?.trim() ?? "";
  const latitude = typeof payload.latitude === "number" ? payload.latitude : null;
  const longitude = typeof payload.longitude === "number" ? payload.longitude : null;

  if (!name) {
    return NextResponse.json({ error: "Cafe name is required." }, { status: 400 });
  }

  const sourceCode = "user-submissions";

  const { data: sourceRow, error: sourceError } = await supabase
    .from(CANONICAL_TABLES.placeSources)
    .upsert(
      [{ code: sourceCode, name: "User submitted cafes" }],
      { onConflict: "code" },
    )
    .select("id")
    .single();

  if (sourceError || !sourceRow?.id) {
    return NextResponse.json({ error: "Could not prepare submission source." }, { status: 500 });
  }

  const externalId = globalThis.crypto?.randomUUID?.() ?? `submission-${Date.now()}`;
  const rawCity =
    area.split(",").map((part) => part.trim()).filter(Boolean).at(-1) ?? null;

  const { error: insertError } = await supabase
    .from(CANONICAL_TABLES.sourcePlaces)
    .insert([
      {
        source_id: sourceRow.id,
        external_id: externalId,
        raw_name: name,
        raw_address: area || null,
        raw_city: rawCity,
        raw_country_code: "ZA",
        latitude,
        longitude,
        payload: {
          submission_type: "user_add_shop",
          note,
          submitted_at: new Date().toISOString(),
        },
        match_status: "unmatched",
      },
    ]);

  if (insertError) {
    return NextResponse.json({ error: "Could not save suggestion." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
