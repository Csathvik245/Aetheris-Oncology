import { NextResponse } from "next/server";
import { createClient as createServerClient, createServiceRoleClient } from "@/app/lib/supabase/server";
import { slugify } from "@/app/lib/institutionSlug";
import { TIER_LIMITS } from "@/app/lib/tiers";
import { initials } from "@/app/lib/profile";
import { computeCapacity, PAID_TIERS } from "@/app/lib/marketing";
import type { PaidPlanTier } from "@/app/lib/supabase/types";

interface CompletePurchaseSignupBody {
  fullName: string;
  institutionName: string;
  tier: PaidPlanTier;
}

// Runs right after supabase.auth.signUp() on the /purchase page (same
// pattern as /api/auth/complete-signup). Creates the institution in
// 'pending_payment' status — the Stripe webhook flips it to 'active' once
// checkout completes — and makes the signer its admin.
export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Partial<CompletePurchaseSignupBody>;
  const { fullName, institutionName, tier } = body;

  if (!fullName?.trim() || !institutionName?.trim() || !tier || !PAID_TIERS.includes(tier)) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  const capacity = await computeCapacity();
  const tierCapacity = capacity.find((c) => c.planTier === tier);
  if (!tierCapacity || tierCapacity.soldOut) {
    return NextResponse.json({ error: "That plan just sold out. Please check /pricing for availability." }, { status: 409 });
  }

  const admin = createServiceRoleClient();
  const baseSlug = slugify(institutionName);
  const slug = `${baseSlug}-${user.id.slice(0, 6)}`;
  const limits = TIER_LIMITS[tier];

  const { data: institution, error: instError } = await admin
    .from("institutions")
    .insert({
      name: institutionName.trim(),
      slug,
      plan_tier: tier,
      status: "pending_payment",
      learner_seat_limit: limits.learnerSeatLimit,
      storage_limit_mb: limits.storageLimitMb,
      case_gen_monthly_limit: limits.caseGenMonthlyLimit,
      feature_flags: limits.featureFlags,
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
    onboarded_at: new Date().toISOString(),
  });

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, institutionId: institution.id });
}
