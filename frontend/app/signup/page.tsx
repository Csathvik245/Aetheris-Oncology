"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/app/lib/supabase/client";

const DISPLAY_ROLES = [
  "Medical Student",
  "PGY-1 Resident",
  "PGY-2 Resident",
  "PGY-3 Resident",
  "PGY-4+ Resident",
  "Fellow",
  "Attending",
];

type Step = "credentials" | "role" | "institution";
type AuthRole = "resident" | "faculty";

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("credentials");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [authRole, setAuthRole] = useState<AuthRole | null>(() => {
    const fromQuery = searchParams.get("role");
    if (fromQuery === "resident" || fromQuery === "faculty") return fromQuery;
    // A join-code link (e.g. shared by a faculty admin) is always meant for
    // residents joining that program, even if it didn't carry ?role=.
    return searchParams.get("joinCode") ? "resident" : null;
  });
  const [displayRole, setDisplayRole] = useState("");

  // A resident invite link (?role=resident&joinCode=X, shared by a faculty
  // admin) locks both the role and the code — this signup flow only exists
  // to onboard the resident that link was generated for, not a general
  // "pick your own role and institution" form.
  const lockedByLink = searchParams.get("role") === "resident" && !!searchParams.get("joinCode");
  const [joinCode, setJoinCode] = useState(() => searchParams.get("joinCode")?.toUpperCase() ?? "");
  const [resolvedInstitution, setResolvedInstitution] = useState<{ id: string; name: string } | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);

  useEffect(() => {
    setResolvedInstitution(null);
    if (joinCode.trim().length < 6) return;
    setCheckingCode(true);
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/institutions/lookup-by-code?code=${encodeURIComponent(joinCode.trim())}`);
        const data = await res.json();
        if (res.ok) {
          setResolvedInstitution(data.institution);
          setError(null);
        } else {
          setResolvedInstitution(null);
        }
      } catch {
        setResolvedInstitution(null);
      } finally {
        setCheckingCode(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [joinCode]);

  function goToRoleStep() {
    setError(null);
    if (!fullName.trim()) return setError("Enter your full name.");
    if (!email.trim()) return setError("Enter your email.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    setStep("role");
  }

  function goToInstitutionStep() {
    setError(null);
    if (!authRole) return setError("Select whether you're a resident or faculty.");
    if (!displayRole) return setError("Select your training level.");
    setStep("institution");
  }

  async function finishSignup() {
    setError(null);
    if (!resolvedInstitution) {
      setError("Enter the join code your program admin gave you.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (signUpError || !data.user) {
      setSubmitting(false);
      setError(signUpError?.message ?? "Signup failed.");
      return;
    }

    const res = await fetch("/api/auth/complete-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: fullName.trim(),
        role: authRole,
        displayRole,
        joinCode: joinCode.trim(),
      }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not finish setting up your account.");
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-navy text-white">
            <GraduationCap size={22} />
          </div>
          <h1 className="mt-4 font-heading text-[22px] font-bold tracking-tight text-foreground">
            Create your Aetheris account
          </h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
            AI-powered oncology training for residents and faculty. Step {stepIndex(step)} of 3.
          </p>
        </div>

        <Card className="p-6">
          {step === "credentials" && (
            <>
              <label className="label mb-1.5 block">
                Full Name <span className="text-coral-text">*</span>
              </label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Alex Rivera" />

              <label className="label mb-1.5 mt-4 block">
                Email <span className="text-coral-text">*</span>
              </label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@program.edu" />

              <label className="label mb-1.5 mt-4 block">
                Password <span className="text-coral-text">*</span>
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                onKeyDown={(e) => e.key === "Enter" && goToRoleStep()}
              />

              {error && <p className="mt-3 text-[12.5px] text-coral-text">{error}</p>}

              <Button onClick={goToRoleStep} className="mt-6 w-full gap-1.5 bg-navy py-5 text-white hover:bg-navy/90">
                Continue <ArrowRight size={15} />
              </Button>
            </>
          )}

          {step === "role" && (
            <>
              {lockedByLink ? (
                <p className="text-[12.5px] text-muted-foreground">
                  This invite link is for residents joining <strong className="text-foreground">{resolvedInstitution?.name ?? "your program"}</strong>.
                </p>
              ) : (
                <>
                  <label className="label mb-1.5 block">I am a…</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["resident", "faculty"] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setAuthRole(r)}
                        className={`rounded-lg border px-3 py-2.5 text-left text-[12.5px] font-medium transition-colors ${
                          authRole === r ? "border-navy bg-navy-tint text-navy" : "border-border text-foreground hover:bg-muted"
                        }`}
                      >
                        {r === "resident" ? "Resident / Trainee" : "Faculty / Program Director"}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <label className="label mb-1.5 mt-5 block">Training level</label>
              <div className="grid grid-cols-2 gap-2">
                {DISPLAY_ROLES.map((r) => (
                  <button
                    key={r}
                    onClick={() => setDisplayRole(r)}
                    className={`rounded-lg border px-3 py-2 text-left text-[12.5px] font-medium transition-colors ${
                      displayRole === r ? "border-navy bg-navy-tint text-navy" : "border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              {error && <p className="mt-3 text-[12.5px] text-coral-text">{error}</p>}

              <div className="mt-6 flex gap-2">
                <Button variant="outline" onClick={() => setStep("credentials")} className="gap-1.5 py-5">
                  <ArrowLeft size={15} /> Back
                </Button>
                <Button onClick={goToInstitutionStep} className="flex-1 gap-1.5 bg-navy py-5 text-white hover:bg-navy/90">
                  Continue <ArrowRight size={15} />
                </Button>
              </div>
            </>
          )}

          {step === "institution" && (
            <>
              <label className="label mb-1.5 block">Your institution's join code</label>
              <Input
                value={joinCode}
                onChange={(e) => !lockedByLink && setJoinCode(e.target.value.toUpperCase())}
                readOnly={lockedByLink}
                placeholder="Join code from your program admin"
                className={`tracking-wider ${lockedByLink ? "cursor-not-allowed bg-muted text-muted-foreground" : ""}`}
              />
              <p className="mt-2 text-[11.5px] text-muted-foreground">
                {lockedByLink
                  ? "This code came from your invite link and can't be changed."
                  : "Ask your faculty admin for your program's join code — it's on their Billing page, or in the link they sent you."}
              </p>
              {checkingCode && <p className="mt-2 text-[11.5px] text-muted-foreground">Checking…</p>}
              {!checkingCode && resolvedInstitution && (
                <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-teal-deep">
                  <CheckCircle2 size={13} /> {resolvedInstitution.name}
                </p>
              )}
              {!checkingCode && joinCode.trim().length >= 6 && !resolvedInstitution && (
                <p className="mt-2 text-[11.5px] text-coral-text">That code isn't valid.</p>
              )}

              {error && <p className="mt-3 text-[12.5px] text-coral-text">{error}</p>}

              <div className="mt-6 flex gap-2">
                <Button variant="outline" onClick={() => setStep("role")} className="gap-1.5 py-5">
                  <ArrowLeft size={15} /> Back
                </Button>
                <Button
                  onClick={finishSignup}
                  disabled={submitting || checkingCode}
                  className="flex-1 gap-1.5 bg-navy py-5 text-white hover:bg-navy/90"
                >
                  {submitting ? "Creating account…" : "Create Account"} <ArrowRight size={15} />
                </Button>
              </div>
            </>
          )}

          <p className="mt-4 text-center text-[12.5px] text-muted-foreground">
            Already have an account?{" "}
            <a href={authRole ? `/login?role=${authRole}` : "/login"} className="font-semibold text-navy hover:underline">
              Sign in
            </a>
          </p>
        </Card>
      </div>
    </div>
  );
}

function stepIndex(step: Step) {
  return { credentials: 1, role: 2, institution: 3 }[step];
}
