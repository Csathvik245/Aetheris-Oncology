import { NextResponse } from "next/server";
import { createClient as createServerClient, createServiceRoleClient } from "@/app/lib/supabase/server";
import { slugify } from "@/app/lib/institutionSlug";
import { TIER_LIMITS, FREE_PILOT_DAYS } from "@/app/lib/tiers";
import { initials } from "@/app/lib/profile";

interface RedeemBody {
  code: string;
  mode: "new" | "existing";
  fullName?: string;
  institutionName?: string;
}

// Redeems a sales-call pilot code, either into a brand-new institution
// (mode "new" — client has just called supabase.auth.signUp()) or as an
// upgrade applied to the caller's existing institution (mode "existing" —
// caller must already be signed in as that institution's admin).
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Partial<RedeemBody>;
  const { code, mode, fullName, institutionName } = body;

  if (!code?.trim() || (mode !== "new" && mode !== "existing")) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const { data: pilotCode, error: codeError } = await admin
    .from("pilot_codes")
    .select("id, plan_tier, target_institution_id, redeemed_at")
    .eq("code", code.trim().toUpperCase())
    .maybeSingle();

  if (codeError || !pilotCode) {
    return NextResponse.json({ error: "That code isn't valid." }, { status: 404 });
  }
  if (pilotCode.redeemed_at) {
    return NextResponse.json({ error: "That code has already been used." }, { status: 409 });
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (mode === "existing") {
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, institution_id")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin" || !profile.institution_id) {
      return NextResponse.json({ error: "Only an institution admin can redeem a code." }, { status: 403 });
    }
    if (pilotCode.target_institution_id && pilotCode.target_institution_id !== profile.institution_id) {
      return NextResponse.json({ error: "This code is reserved for a different institution." }, { status: 403 });
    }

    const limits = TIER_LIMITS[pilotCode.plan_tier as keyof typeof TIER_LIMITS];
    const now = new Date();
    const isFreePilot = pilotCode.plan_tier === "free_pilot";
    await admin
      .from("institutions")
      .update({
        plan_tier: pilotCode.plan_tier,
        status: "active",
        learner_seat_limit: limits.learnerSeatLimit,
        storage_limit_mb: limits.storageLimitMb,
        case_gen_monthly_limit: limits.caseGenMonthlyLimit,
        feature_flags: limits.featureFlags,
        pilot_code_id: pilotCode.id,
        free_pilot_started_at: isFreePilot ? now.toISOString() : null,
        free_pilot_expires_at: isFreePilot ? new Date(now.getTime() + FREE_PILOT_DAYS * 24 * 60 * 60 * 1000).toISOString() : null,
      })
      .eq("id", profile.institution_id);

    await admin
      .from("pilot_codes")
      .update({ redeemed_institution_id: profile.institution_id, redeemed_at: now.toISOString() })
      .eq("id", pilotCode.id);

    return NextResponse.json({ ok: true, institutionId: profile.institution_id });
  }

  // mode === "new"
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (pilotCode.target_institution_id) {
    return NextResponse.json({ error: "This code is reserved to upgrade an existing institution. Log in to that institution first." }, { status: 403 });
  }
  if (!fullName?.trim() || !institutionName?.trim()) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const limits = TIER_LIMITS[pilotCode.plan_tier as keyof typeof TIER_LIMITS];
  const now = new Date();
  const isFreePilot = pilotCode.plan_tier === "free_pilot";
  const baseSlug = slugify(institutionName);
  const slug = `${baseSlug}-${user.id.slice(0, 6)}`;

  const { data: institution, error: instError } = await admin
    .from("institutions")
    .insert({
      name: institutionName.trim(),
      slug,
      plan_tier: pilotCode.plan_tier,
      status: "active",
      learner_seat_limit: limits.learnerSeatLimit,
      storage_limit_mb: limits.storageLimitMb,
      case_gen_monthly_limit: limits.caseGenMonthlyLimit,
      feature_flags: limits.featureFlags,
      pilot_code_id: pilotCode.id,
      free_pilot_started_at: isFreePilot ? now.toISOString() : null,
      free_pilot_expires_at: isFreePilot ? new Date(now.getTime() + FREE_PILOT_DAYS * 24 * 60 * 60 * 1000).toISOString() : null,
    })
    .select("id")
    .single();

  if (instError || !institution) {
    return NextResponse.json({ error: instError?.message ?? "Failed to create institution" }, { status: 500 });
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: user.id,
    institution_id: institution.id,
    role: "admin",
    full_name: fullName.trim(),
    avatar_initials: initials(fullName.trim()),
    onboarded_at: now.toISOString(),
  });

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  await admin
    .from("pilot_codes")
    .update({ redeemed_institution_id: institution.id, redeemed_at: now.toISOString() })
    .eq("id", pilotCode.id);

  return NextResponse.json({ ok: true, institutionId: institution.id });
}
