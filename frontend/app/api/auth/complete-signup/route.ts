import { NextResponse } from "next/server";
import { createClient as createServerClient, createServiceRoleClient } from "@/app/lib/supabase/server";
import { initials } from "@/app/lib/profile";

interface CompleteSignupBody {
  fullName: string;
  role: "resident" | "faculty";
  displayRole: string;
  joinCode: string;
}

// Runs immediately after auth.signUp() succeeds on the client (which sets
// the session cookie). Institution creation intentionally does NOT happen
// here — that only ever happens via a paid checkout
// (/api/marketing/complete-purchase-signup) or a sales-call pilot code
// (/api/marketing/redeem-code). This endpoint only ever joins an existing
// institution, resolved from its join code — never a raw client-supplied
// institutionId, since that would let any authenticated user join any
// institution just by guessing/searching its id.
export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json()) as CompleteSignupBody;
  const { fullName, role, displayRole, joinCode } = body;

  if (!fullName?.trim() || !role || !joinCode?.trim()) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const admin = createServiceRoleClient();

  const { data: institution, error: lookupError } = await admin
    .from("institutions")
    .select("id, learner_seat_limit")
    .eq("join_code", joinCode.trim().toUpperCase())
    .single();

  if (lookupError || !institution) {
    return NextResponse.json({ error: "That join code isn't valid." }, { status: 404 });
  }

  if (role === "resident" && institution.learner_seat_limit !== null) {
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("institution_id", institution.id)
      .eq("role", "resident");

    if ((count ?? 0) >= institution.learner_seat_limit) {
      return NextResponse.json(
        { error: "This institution has reached its learner seat limit. Contact your program admin." },
        { status: 409 },
      );
    }
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: user.id,
    institution_id: institution.id,
    role,
    display_role: displayRole || null,
    full_name: fullName.trim(),
    avatar_initials: initials(fullName.trim()),
    onboarded_at: new Date().toISOString(),
  });

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, institutionId: institution.id, role });
}
