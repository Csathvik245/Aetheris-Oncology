"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap, ArrowRight, CheckCircle2 } from "lucide-react";
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

type AuthRole = "resident" | "faculty";

// Reached right after a first-time Google sign-in (see /auth/callback) —
// Google gives us an authenticated user but skips the role/join-code
// collection our normal /signup flow does, so this fills that gap once.
export default function CompleteProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [fullName, setFullName] = useState("");
  const lockedByLink = searchParams.get("role") === "resident" && !!searchParams.get("joinCode");
  const [authRole, setAuthRole] = useState<AuthRole | null>(() => {
    const fromQuery = searchParams.get("role");
    if (fromQuery === "resident" || fromQuery === "faculty") return fromQuery;
    return searchParams.get("joinCode") ? "resident" : null;
  });
  const [displayRole, setDisplayRole] = useState("");
  const [joinCode, setJoinCode] = useState(() => searchParams.get("joinCode")?.toUpperCase() ?? "");
  const [resolvedInstitution, setResolvedInstitution] = useState<{ id: string; name: string } | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      const metaName = (user.user_metadata?.full_name || user.user_metadata?.name) as string | undefined;
      if (metaName) setFullName(metaName);
      setCheckingSession(false);
    });
  }, [router]);

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

  async function finish() {
    setError(null);
    if (!fullName.trim()) return setError("Enter your full name.");
    if (!authRole) return setError("Select whether you're a resident or faculty.");
    if (!displayRole) return setError("Select your training level.");
    if (!resolvedInstitution) return setError("Enter the join code your program admin gave you.");

    setSubmitting(true);
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
    setDone(true);
    setTimeout(() => {
      router.replace("/");
      router.refresh();
    }, 1000);
  }

  if (checkingSession) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-navy text-white">
            <GraduationCap size={22} />
          </div>
          <h1 className="mt-4 font-heading text-[22px] font-bold tracking-tight text-foreground">
            One more step
          </h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
            Tell us who you are and which program you're joining.
          </p>
        </div>

        <Card className="p-6">
          {done ? (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <CheckCircle2 size={28} className="text-teal-deep" />
              <p className="text-[13.5px] font-medium text-foreground">You're all set — redirecting…</p>
            </div>
          ) : (
            <>
              <label className="label mb-1.5 block">Full Name</label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Alex Rivera" />

              {!lockedByLink && (
                <>
                  <label className="label mb-1.5 mt-4 block">I am a…</label>
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

              <label className="label mb-1.5 mt-4 block">Training level</label>
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

              <label className="label mb-1.5 mt-4 block">Institution join code</label>
              <Input
                value={joinCode}
                onChange={(e) => !lockedByLink && setJoinCode(e.target.value.toUpperCase())}
                readOnly={lockedByLink}
                placeholder="Join code from your program admin"
                className={`tracking-wider ${lockedByLink ? "cursor-not-allowed bg-muted text-muted-foreground" : ""}`}
              />
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

              <Button onClick={finish} disabled={submitting || checkingCode} className="mt-6 w-full gap-1.5 bg-navy py-5 text-white hover:bg-navy/90">
                {submitting ? "Finishing…" : "Continue"} <ArrowRight size={15} />
              </Button>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
