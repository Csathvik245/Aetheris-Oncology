"use client";

import { useState } from "react";
import { KeyRound, CheckCircle2, Copy, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/app/lib/supabase/client";
import { useAuth } from "@/app/lib/supabase/AuthProvider";

export default function RedeemCodePage() {
  const { user, profile, loading } = useAuth();
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [code, setCode] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redeemed, setRedeemed] = useState(false);
  const [residentLink, setResidentLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function copyResidentLink() {
    if (!residentLink) return;
    navigator.clipboard.writeText(residentLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function redeemForExisting() {
    setError(null);
    if (!code.trim()) {
      setError("Enter your code.");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/marketing/redeem-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim(), mode: "existing" }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Could not redeem that code.");
      return;
    }
    if (data.joinCode) setResidentLink(`${window.location.origin}/signup?role=resident&joinCode=${data.joinCode}`);
    setRedeemed(true);
  }

  async function redeemForNew() {
    setError(null);
    if (!code.trim() || !institutionName.trim() || !fullName.trim() || !email.trim() || password.length < 6) {
      setError("Fill in every field — password must be at least 6 characters.");
      return;
    }
    setSubmitting(true);
    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({ email: email.trim(), password });
    if (signUpError) {
      setSubmitting(false);
      setError(signUpError.message);
      return;
    }
    const res = await fetch("/api/marketing/redeem-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: code.trim(),
        mode: "new",
        institutionName: institutionName.trim(),
        fullName: fullName.trim(),
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Could not redeem that code.");
      return;
    }
    if (data.joinCode) setResidentLink(`${window.location.origin}/signup?role=resident&joinCode=${data.joinCode}`);
    setRedeemed(true);
  }

  const alreadyInInstitution = !loading && !!user && !!profile?.institution_id;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-navy text-white">
            <KeyRound size={22} />
          </div>
          <h1 className="mt-4 font-heading text-[22px] font-bold tracking-tight text-foreground">Redeem a Code</h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
            Got a code from a call with our team? Enter it below to activate your program.
          </p>
        </div>

        <Card className="p-6">
          {redeemed ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <CheckCircle2 size={32} className="text-teal-deep" />
              <p className="text-[14px] font-medium text-foreground">Code redeemed</p>
              <p className="text-[12.5px] text-muted-foreground">Your program is now active.</p>

              {residentLink && (
                <div className="mt-4 w-full rounded-lg border border-border bg-muted/40 p-4 text-left">
                  <p className="text-[12.5px] font-medium text-foreground">Share this link with your residents</p>
                  <p className="mt-1 text-[11.5px] text-muted-foreground">
                    They click it, create their own account, and are linked to your program automatically.
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate rounded-md bg-card px-2 py-1.5 text-[11.5px] text-foreground">
                      {residentLink}
                    </code>
                    <Button variant="outline" onClick={copyResidentLink} className="shrink-0 gap-1.5">
                      {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                </div>
              )}

              <a href="/" className="mt-4 text-[12.5px] font-semibold text-navy hover:underline">Go to Dashboard →</a>
            </div>
          ) : (
            <>
              <div className="mb-4 flex rounded-lg border border-border p-1">
                <button
                  onClick={() => setMode("new")}
                  className={`flex-1 rounded-md py-1.5 text-[12.5px] font-medium transition-colors ${mode === "new" ? "bg-navy text-white" : "text-muted-foreground"}`}
                >
                  New Institution
                </button>
                <button
                  onClick={() => setMode("existing")}
                  className={`flex-1 rounded-md py-1.5 text-[12.5px] font-medium transition-colors ${mode === "existing" ? "bg-navy text-white" : "text-muted-foreground"}`}
                >
                  Upgrade My Institution
                </button>
              </div>

              <label className="label mb-1.5 block">Pilot Code</label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX"
                className="tracking-wider"
              />

              {mode === "existing" ? (
                alreadyInInstitution ? (
                  <>
                    {error && <p className="mt-3 text-[12.5px] text-coral-text">{error}</p>}
                    <Button onClick={redeemForExisting} disabled={submitting} className="mt-6 w-full bg-navy py-5 text-white hover:bg-navy/90">
                      {submitting ? "Redeeming…" : "Apply to My Institution"}
                    </Button>
                  </>
                ) : (
                  <p className="mt-4 text-[12.5px] text-muted-foreground">
                    You need to be signed in as your institution's admin to apply an upgrade code.{" "}
                    <a href="/login?role=faculty&next=/redeem" className="font-semibold text-navy hover:underline">Log in first</a>
                  </p>
                )
              ) : (
                <>
                  <label className="label mb-1.5 mt-4 block">Institution Name</label>
                  <Input value={institutionName} onChange={(e) => setInstitutionName(e.target.value)} placeholder="University Hospital" />

                  <label className="label mb-1.5 mt-4 block">Your Name</label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Dr. Jane Smith" />

                  <label className="label mb-1.5 mt-4 block">Work Email</label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@hospital.org" />

                  <label className="label mb-1.5 mt-4 block">Password</label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />

                  {error && <p className="mt-3 text-[12.5px] text-coral-text">{error}</p>}

                  <Button onClick={redeemForNew} disabled={submitting} className="mt-6 w-full bg-navy py-5 text-white hover:bg-navy/90">
                    {submitting ? "Setting up…" : "Redeem & Activate"}
                  </Button>
                </>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
