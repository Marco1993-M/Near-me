import { NextResponse } from "next/server";
import { CANONICAL_TABLES } from "@/lib/db-schema";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function GET() {
  const urlConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL);
  const anonConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_KEY);
  const serviceRoleConfigured = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        stage: "client",
        env: {
          urlConfigured,
          anonConfigured,
          serviceRoleConfigured,
        },
      },
      { status: 500 },
    );
  }

  const { count, error } = await supabase
    .from(CANONICAL_TABLES.cafes)
    .select("id", { count: "exact", head: true })
    .eq("status", "active");

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        stage: "query",
        env: {
          urlConfigured,
          anonConfigured,
          serviceRoleConfigured,
        },
        error: {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        },
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    env: {
      urlConfigured,
      anonConfigured,
      serviceRoleConfigured,
    },
    activeCafeCount: count ?? 0,
  });
}
