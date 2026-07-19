import { NextResponse } from "next/server";
import { Resend } from "resend";
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
    sendToEmail?: string;
    recipientName?: string;
    institutionName?: string;
  };
  const { planTier, targetInstitutionId, notes, sendToEmail, recipientName, institutionName } = body;
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

  let emailed = false;
  if (sendToEmail?.trim() && process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      await resend.emails.send({
        from: "Aetheris Oncology <onboarding@resend.dev>",
        to: sendToEmail.trim(),
        subject: "Your Aetheris Oncology pilot code",
        text: `Hi${recipientName ? ` ${recipientName}` : ""},

Great talking with you${institutionName ? ` about ${institutionName}` : ""}! Here's your activation code:

${data.code}

To activate: go to ${appUrl}/redeem, enter this code, and either create your institution's account (if you're new) or apply it to your existing one.

Looking forward to having your residents on board.

— Aetheris Oncology`,
      });
      emailed = true;
    } catch {
      // The code is already created/visible in /admin either way — email is best-effort.
    }
  }

  return NextResponse.json({ code: data, emailed });
}
