import { NextResponse } from "next/server";
import { createClient as createServerClient, createServiceRoleClient } from "@/app/lib/supabase/server";

export const runtime = "nodejs";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

async function requireInstitutionAdmin() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("role, institution_id").eq("id", user.id).single();
  if (!profile || profile.role !== "admin" || !profile.institution_id) return null;
  return profile.institution_id;
}

export async function GET() {
  const institutionId = await requireInstitutionAdmin();
  if (!institutionId) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const service = createServiceRoleClient();
  const { data, error } = await service.from("institutions").select("join_code").eq("id", institutionId).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ joinCode: data.join_code });
}

export async function POST() {
  const institutionId = await requireInstitutionAdmin();
  if (!institutionId) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const service = createServiceRoleClient();
  let code = "";
  for (let tries = 0; tries < 10; tries++) {
    code = generateCode();
    const { data: existing } = await service.from("institutions").select("id").eq("join_code", code).maybeSingle();
    if (!existing) break;
  }

  const { error } = await service.from("institutions").update({ join_code: code }).eq("id", institutionId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ joinCode: code });
}
