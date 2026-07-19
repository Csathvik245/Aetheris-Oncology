import { redirect } from "next/navigation";

// Local-account onboarding has been replaced by real Supabase auth —
// see /signup (credentials → role → institution).
export default function OnboardingPage() {
  redirect("/signup");
}
