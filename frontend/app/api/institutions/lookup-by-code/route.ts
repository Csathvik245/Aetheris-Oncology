import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/app/lib/supabase/server";

export const runtime = "nodejs";

// Public, pre-auth — the signup "join an institution" step resolves the
// institution from the code the resident/faculty was given, rather than
// trusting a client-supplied institutionId directly.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = (searchParams.get("code") ?? "").trim().toUpperCase();
  if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("institutions")
    .select("id, name")
    .eq("join_code", code)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "That code isn't valid." }, { status: 404 });
  return NextResponse.json({ institution: data });
}
