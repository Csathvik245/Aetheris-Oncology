import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

// Handles Supabase email-link / OAuth redirects (magic link, password reset,
// Google sign-in). Exchanges the `code` param for a session, then sends the
// user home — unless this is a brand-new OAuth sign-in with no profile row
// yet (Google auth creates the auth.users row but skips our normal
// role/join-code collection step), in which case it routes to
// /auth/complete-profile instead so that still happens.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);
    if (data.user) {
      const { data: profile } = await supabase.from("profiles").select("id").eq("id", data.user.id).maybeSingle();
      if (!profile) {
        const params = new URLSearchParams(next.split("?")[1] ?? "");
        return NextResponse.redirect(`${origin}/auth/complete-profile?${params.toString()}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
