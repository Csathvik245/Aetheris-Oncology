"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap, Stethoscope, Building2, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/app/lib/supabase/client";
import { signInWithGoogle } from "@/app/lib/supabase/oauth";
import { GoogleIcon } from "@/app/components/GoogleIcon";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const role = searchParams.get("role");
  const isFaculty = role === "faculty";
  const isResident = role === "resident";

  async function handleLogin() {
    setError(null);
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setSubmitting(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setSubmitting(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.replace(searchParams.get("next") || "/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div
            className={`mx-auto grid h-12 w-12 place-items-center rounded-2xl text-white ${
              isFaculty ? "bg-teal-deep" : "bg-navy"
            }`}
          >
            {isFaculty ? <Building2 size={22} /> : isResident ? <Stethoscope size={22} /> : <GraduationCap size={22} />}
          </div>
          <h1 className="mt-4 font-heading text-[22px] font-bold tracking-tight text-foreground">
            {isFaculty ? "Faculty & Institution Sign In" : isResident ? "Resident Sign In" : "Sign in to Aetheris"}
          </h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
            {isFaculty
              ? "See every resident's competency progression, review submissions, and build training cases."
              : isResident
                ? "Practice cases, take board exams, and get a persistent AI mentor."
                : "Oncology resident training simulator for your residency program."}
          </p>
        </div>

        <Card className="p-6">
          <Button
            variant="outline"
            onClick={() => signInWithGoogle(searchParams.get("next") || "/")}
            className="w-full gap-2 py-5"
          >
            <GoogleIcon size={16} /> Continue with Google
          </Button>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <label className="label mb-1.5 block">Email</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@program.edu"
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />

          <label className="label mb-1.5 mt-4 block">Password</label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />

          {error && <p className="mt-3 text-[12.5px] text-coral-text">{error}</p>}

          <Button
            onClick={handleLogin}
            disabled={submitting}
            className={`mt-6 w-full gap-1.5 py-5 text-white ${isFaculty ? "bg-teal-deep hover:bg-teal-deep/90" : "bg-navy hover:bg-navy/90"}`}
          >
            {submitting ? "Signing in…" : "Sign In"} <ArrowRight size={15} />
          </Button>
          <p className="mt-4 text-center text-[12px] text-muted-foreground">
            New program?{" "}
            <a href="/pricing" className="font-semibold text-navy hover:underline">
              See plans
            </a>{" "}
            or{" "}
            <a href="/pilot" className="font-semibold text-navy hover:underline">
              request a pilot
            </a>
            . Residents need an invite link from their program admin.
          </p>
        </Card>

        {!role && (
          <p className="mt-4 text-center text-[12px] text-muted-foreground">
            <a href="/" className="hover:underline">
              ← Back to resident / faculty selection
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
