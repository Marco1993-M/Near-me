import { NextResponse } from "next/server";
import { getCandidateTrustSnapshot } from "@/lib/candidate-trust";
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
  const { data: existingCandidate } = await supabase
    .from(CANONICAL_TABLES.sourcePlaces)
    .select("id, payload")
    .eq("source_id", sourceRow.id)
    .eq("raw_name", name)
    .eq("raw_address", area || null)
    .neq("match_status", "ignored")
    .maybeSingle();

  if (existingCandidate?.id) {
    const existingPayload =
      existingCandidate.payload && typeof existingCandidate.payload === "object"
        ? existingCandidate.payload
        : {};
    const existingSupportNotes = Array.isArray((existingPayload as { support_notes?: unknown[] }).support_notes)
      ? ((existingPayload as { support_notes?: string[] }).support_notes ?? [])
      : [];
    const nextPayload = {
      ...existingPayload,
      submission_type: "user_add_shop",
      note: note || (existingPayload as { note?: string }).note || "",
      submitted_at: new Date().toISOString(),
      support_count: Number((existingPayload as { support_count?: number }).support_count ?? 0) + 1,
      support_notes: note ? [...existingSupportNotes, note].slice(-8) : existingSupportNotes,
    };

    const { error: updateError } = await supabase
      .from(CANONICAL_TABLES.sourcePlaces)
      .update({ payload: nextPayload })
      .eq("id", existingCandidate.id);

    if (updateError) {
      return NextResponse.json({ error: "Could not update suggestion." }, { status: 500 });
    }

    return NextResponse.json({ success: true, trust: getCandidateTrustSnapshot(nextPayload) });
  }

  const nextPayload = {
    submission_type: "user_add_shop",
    note,
    submitted_at: new Date().toISOString(),
    support_count: 1,
    support_notes: note ? [note] : [],
  };

  const { error: insertError } = await supabase.from(CANONICAL_TABLES.sourcePlaces).insert([
    {
      source_id: sourceRow.id,
      external_id: externalId,
      raw_name: name,
      raw_address: area || null,
      raw_city: rawCity,
      raw_country_code: "ZA",
      latitude,
      longitude,
      payload: nextPayload,
      match_status: "unmatched",
    },
  ]);

  if (insertError) {
    return NextResponse.json({ error: "Could not save suggestion." }, { status: 500 });
  }

  return NextResponse.json({ success: true, trust: getCandidateTrustSnapshot(nextPayload) });
}
