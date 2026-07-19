import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/app/lib/supabase/server";

// Public, pre-auth institution lookup for the signup "join existing
// institution" picker. Only exposes name/slug/id — no billing or usage data
// — so this is safe to call before a session/profile exists.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ institutions: [] });

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("institutions")
    .select("id, name, slug")
    .ilike("name", `%${q}%`)
    .limit(8);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ institutions: data ?? [] });
}
