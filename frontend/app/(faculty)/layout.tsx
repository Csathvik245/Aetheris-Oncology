import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";

// Server-side role gate for every /faculty/* route. proxy.ts already
// requires a session; this additionally requires role in (faculty, admin) —
// residents get bounced home instead of seeing faculty-only pages.
export default async function FacultyLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role === "resident") redirect("/");

  return <>{children}</>;
}
