import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/app/lib/supabase/server";
import { requirePlatformAdmin } from "@/app/lib/marketing";
import type { PlanTier } from "@/app/lib/supabase/types";

export const runtime = "nodejs";

const VALID_TIERS: PlanTier[] = ["free_pilot", "starter", "professional", "academic"];
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity

function generateCode(): string {
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export async function GET() {
  const admin = await requirePlatformAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("pilot_codes")
    .select("id, code, plan_tier, target_institution_id, redeemed_institution_id, redeemed_at, notes, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ codes: data });
}

export async function POST(request: Request) {
  const admin = await requirePlatformAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as {
    planTier?: PlanTier;
    targetInstitutionId?: string;
    notes?: string;
  };
  const { planTier, targetInstitutionId, notes } = body;
  if (!planTier || !VALID_TIERS.includes(planTier)) {
    return NextResponse.json({ error: "Invalid plan tier" }, { status: 400 });
  }

  const service = createServiceRoleClient();
  const code = generateCode();
  const { data, error } = await service
    .from("pilot_codes")
    .insert({
      code,
      plan_tier: planTier,
      target_institution_id: targetInstitutionId || null,
      notes: notes?.trim() || null,
    })
    .select("id, code, plan_tier, target_institution_id, notes, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ code: data });
}
