import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

// Handles Supabase email-link / OAuth redirects (magic link, password reset,
// future SSO). Exchanges the `code` param for a session, then sends the
// user home.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
