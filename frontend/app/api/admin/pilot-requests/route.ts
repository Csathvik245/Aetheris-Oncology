import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/app/lib/supabase/server";
import { requirePlatformAdmin } from "@/app/lib/marketing";

export const runtime = "nodejs";

const VALID_STATUSES = ["new", "contacted", "closed"] as const;

export async function GET() {
  const admin = await requirePlatformAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("pilot_requests")
    .select("id, institution_name, contact_name, contact_email, phone, message, status, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requests: data });
}

export async function PATCH(request: Request) {
  const admin = await requirePlatformAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as { id?: string; status?: string };
  const { id, status } = body;
  if (!id || !status || !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    return NextResponse.json({ error: "Invalid fields" }, { status: 400 });
  }

  const service = createServiceRoleClient();
  const { error } = await service.from("pilot_requests").update({ status }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
