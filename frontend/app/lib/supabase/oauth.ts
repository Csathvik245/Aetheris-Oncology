import { createClient } from "./client";

/** Kicks off Google OAuth. `next` is where /auth/callback sends the user
 * after exchanging the code — pass through any ?role=/&joinCode= so a
 * resident invite link survives the round trip through Google. */
export async function signInWithGoogle(next: string = "/") {
  const supabase = createClient();
  const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
}
