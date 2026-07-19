import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createServiceRoleClient } from "@/app/lib/supabase/server";

export const runtime = "nodejs";

const NOTIFY_EMAIL = "aetherisoncology@gmail.com";

interface PilotRequestBody {
  institutionName: string;
  contactName: string;
  contactEmail: string;
  phone?: string;
  message?: string;
}

// Public — the "/pilot" request-a-pilot form. Logs the lead into
// pilot_requests for the founder to see in /admin, and best-effort emails a
// notification — a failed/unconfigured email should never block lead capture.
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

  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Aetheris Oncology <onboarding@resend.dev>",
        to: NOTIFY_EMAIL,
        replyTo: contactEmail.trim(),
        subject: `New pilot request: ${institutionName.trim()}`,
        text: `Institution: ${institutionName.trim()}
Contact: ${contactName.trim()} <${contactEmail.trim()}>
Phone: ${phone?.trim() || "(none provided)"}

Message:
${message?.trim() || "(none provided)"}

View all requests: ${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/admin`,
      });
    } catch {
      // Email is a nice-to-have notification — the lead is already saved above.
    }
  }

  return NextResponse.json({ ok: true });
}
