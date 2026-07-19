import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/app/lib/supabase/server";

export const runtime = "nodejs";

interface PilotRequestBody {
  institutionName: string;
  contactName: string;
  contactEmail: string;
  phone?: string;
  message?: string;
}

// Public — the "/pilot" request-a-pilot form. Just logs the lead into
// pilot_requests for the founder to see in /admin and follow up by phone;
// no email/CRM integration exists yet.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Partial<PilotRequestBody>;
  const { institutionName, contactName, contactEmail, phone, message } = body;

  if (!institutionName?.trim() || !contactName?.trim() || !contactEmail?.trim()) {
    return NextResponse.json({ error: "Institution name, contact name, and email are required." }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const { error } = await admin.from("pilot_requests").insert({
    institution_name: institutionName.trim(),
    contact_name: contactName.trim(),
    contact_email: contactEmail.trim(),
    phone: phone?.trim() || null,
    message: message?.trim() || null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
