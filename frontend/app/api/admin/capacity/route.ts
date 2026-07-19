import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/app/lib/supabase/server";
import { computeCapacity, requirePlatformAdmin, PAID_TIERS } from "@/app/lib/marketing";
import type { PaidPlanTier } from "@/app/lib/supabase/types";

export const runtime = "nodejs";

export async function GET() {
  const admin = await requirePlatformAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const capacity = await computeCapacity();
  return NextResponse.json({ capacity });
}

export async function PATCH(request: Request) {
  const admin = await requirePlatformAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as { planTier?: PaidPlanTier; maxInstitutions?: number };
  const { planTier, maxInstitutions } = body;
  if (!planTier || !PAID_TIERS.includes(planTier) || typeof maxInstitutions !== "number" || maxInstitutions < 0) {
    return NextResponse.json({ error: "Invalid fields" }, { status: 400 });
  }

  const service = createServiceRoleClient();
  const { error } = await service
    .from("plan_seat_caps")
    .update({ max_institutions: maxInstitutions, updated_at: new Date().toISOString() })
    .eq("plan_tier", planTier);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
