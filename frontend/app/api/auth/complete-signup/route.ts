import { NextResponse } from "next/server";
import { createClient as createServerClient, createServiceRoleClient } from "@/app/lib/supabase/server";
import { slugify } from "@/app/lib/institutionSlug";
import { TIER_LIMITS, FREE_PILOT_DAYS } from "@/app/lib/tiers";
import { initials } from "@/app/lib/profile";

interface CompleteSignupBody {
  fullName: string;
  role: "resident" | "faculty";
  displayRole: string;
  institutionMode: "join" | "create";
  joinCode?: string;
  institutionName?: string;
}

// Runs immediately after auth.signUp() succeeds on the client (which sets
// the session cookie). Provisions the institution (join or create) and the
// profile row using the service-role client, since profiles/institutions
// have no direct insert policy for the authenticated role by design —
// tenant provisioning is a privileged, server-only operation.
export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json()) as CompleteSignupBody;
  const { fullName, role, displayRole, institutionMode, joinCode, institutionName } = body;

  if (!fullName?.trim() || !role || !institutionMode) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const admin = createServiceRoleClient();

  let resolvedInstitutionId: string;

  if (institutionMode === "create") {
    if (!institutionName?.trim()) {
      return NextResponse.json({ error: "Institution name is required" }, { status: 400 });
    }
    const baseSlug = slugify(institutionName);
    const slug = `${baseSlug}-${user.id.slice(0, 6)}`;
    const limits = TIER_LIMITS.free_pilot;
    const now = new Date();
    const expires = new Date(now.getTime() + FREE_PILOT_DAYS * 24 * 60 * 60 * 1000);

    const { data: institution, error: instError } = await admin
      .from("institutions")
      .insert({
        name: institutionName.trim(),
        slug,
        plan_tier: "free_pilot",
        learner_seat_limit: limits.learnerSeatLimit,
        storage_limit_mb: limits.storageLimitMb,
        case_gen_monthly_limit: limits.caseGenMonthlyLimit,
        free_pilot_started_at: now.toISOString(),
        free_pilot_expires_at: expires.toISOString(),
        feature_flags: limits.featureFlags,
      })
      .select("id")
      .single();

    if (instError || !institution) {
      return NextResponse.json({ error: instError?.message ?? "Failed to create institution" }, { status: 500 });
    }
    resolvedInstitutionId = institution.id;
    // First person to create an institution is its admin, regardless of
    // the "resident/faculty" toggle they picked — someone has to own billing.
  } else {
    if (!joinCode?.trim()) {
      return NextResponse.json({ error: "A join code is required" }, { status: 400 });
    }
    // Resolve the institution from the code itself — never trust a raw
    // institutionId from the client, since that would let any authenticated
    // user join any institution just by guessing/searching its id.
    const { data: institution, error: lookupError } = await admin
      .from("institutions")
      .select("id, learner_seat_limit")
      .eq("join_code", joinCode.trim().toUpperCase())
      .single();

    if (lookupError || !institution) {
      return NextResponse.json({ error: "That join code isn't valid." }, { status: 404 });
    }
    const institutionId = institution.id;

    if (role === "resident" && institution.learner_seat_limit !== null) {
      const { count } = await admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("institution_id", institutionId)
        .eq("role", "resident");

      if ((count ?? 0) >= institution.learner_seat_limit) {
        return NextResponse.json(
          { error: "This institution has reached its learner seat limit. Contact your program admin." },
          { status: 409 },
        );
      }
    }
    resolvedInstitutionId = institutionId;
  }

  const resolvedRole = institutionMode === "create" ? "admin" : role;

  const { error: profileError } = await admin.from("profiles").insert({
    id: user.id,
    institution_id: resolvedInstitutionId,
    role: resolvedRole,
    display_role: displayRole || null,
    full_name: fullName.trim(),
    avatar_initials: initials(fullName.trim()),
    onboarded_at: new Date().toISOString(),
  });

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, institutionId: resolvedInstitutionId, role: resolvedRole });
}
