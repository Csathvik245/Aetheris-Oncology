import { createClient as createServerClient, createServiceRoleClient } from "@/app/lib/supabase/server";
import type { PaidPlanTier } from "@/app/lib/supabase/types";

// Every /api/admin/* route calls this first — is_platform_admin is a
// founder-only flag set by hand (scripts/grant-platform-admin.mjs), never
// settable through any API.
export async function requirePlatformAdmin() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("is_platform_admin").eq("id", user.id).single();
  if (!profile?.is_platform_admin) return null;

  return user;
}

export const PAID_TIERS: PaidPlanTier[] = ["starter", "professional", "academic"];

export interface TierCapacity {
  planTier: PaidPlanTier;
  maxInstitutions: number;
  activeCount: number;
  remaining: number;
  soldOut: boolean;
}

// Only status='active' institutions consume a purchase slot — an abandoned
// checkout leaves the institution row in 'pending_payment' and doesn't
// block a real buyer from taking that seat.
export async function computeCapacity(): Promise<TierCapacity[]> {
  const admin = createServiceRoleClient();
  const { data: caps } = await admin.from("plan_seat_caps").select("plan_tier, max_institutions");

  const results: TierCapacity[] = [];
  for (const tier of PAID_TIERS) {
    const cap = caps?.find((c) => c.plan_tier === tier);
    const maxInstitutions = cap?.max_institutions ?? 0;
    const { count } = await admin
      .from("institutions")
      .select("id", { count: "exact", head: true })
      .eq("plan_tier", tier)
      .eq("status", "active");
    const activeCount = count ?? 0;
    results.push({
      planTier: tier,
      maxInstitutions,
      activeCount,
      remaining: Math.max(0, maxInstitutions - activeCount),
      soldOut: activeCount >= maxInstitutions,
    });
  }
  return results;
}
