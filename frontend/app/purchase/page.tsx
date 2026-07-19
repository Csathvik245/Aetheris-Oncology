"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/app/lib/supabase/client";
import { TIER_LIMITS } from "@/app/lib/tiers";
import type { PaidPlanTier } from "@/app/lib/supabase/types";
import type { TierCapacity } from "@/app/lib/marketing";

const PAID_TIERS: PaidPlanTier[] = ["starter", "professional", "academic"];

export default function PurchasePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTier = searchParams.get("tier") as PaidPlanTier | null;
  const tier: PaidPlanTier = requestedTier && PAID_TIERS.includes(requestedTier) ? requestedTier : "starter";

  const [capacity, setCapacity] = useState<TierCapacity | null>(null);
  const [institutionName, setInstitutionName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/marketing/capacity")
      .then((r) => r.json())
      .then((d) => setCapacity((d.capacity ?? []).find((c: TierCapacity) => c.planTier === tier) ?? null));
  }, [tier]);

  async function submit() {
    setError(null);
    if (!institutionName.trim() || !fullName.trim() || !email.trim() || password.length < 6) {
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

    const signupRes = await fetch("/api/marketing/complete-purchase-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: fullName.trim(), institutionName: institutionName.trim(), tier }),
    });
    const signupData = await signupRes.json();
    if (!signupRes.ok) {
      setSubmitting(false);
      setError(signupData.error ?? "Could not create your institution.");
      return;
    }

    const checkoutRes = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier }),
    });
    const checkoutData = await checkoutRes.json();
    setSubmitting(false);
    if (!checkoutRes.ok || !checkoutData.url) {
      setError(checkoutData.error ?? "Your account was created, but checkout isn't available right now — contact us to finish setup.");
      return;
    }
    router.push(checkoutData.url);
  }

  const limits = TIER_LIMITS[tier];
  const soldOut = capacity?.soldOut ?? false;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-navy text-white">
            <Building2 size={22} />
          </div>
          <h1 className="mt-4 font-heading text-[22px] font-bold tracking-tight text-foreground">
            Set Up {limits.label}
          </h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
            ${limits.monthlyPrice?.toLocaleString()}/mo · {limits.learnerSeatLimit} learner seats. Create your
            program's account now — you'll complete payment on the next step.
          </p>
        </div>

        <Card className="p-6">
          {soldOut ? (
            <p className="text-[13px] text-coral-text">
              This plan just sold out. <a href="/pricing" className="font-semibold underline">See other plans</a> or{" "}
              <a href="/pilot" className="font-semibold underline">request a pilot</a>.
            </p>
          ) : (
            <>
              <label className="label mb-1.5 block">Institution Name</label>
              <Input value={institutionName} onChange={(e) => setInstitutionName(e.target.value)} placeholder="University Hospital" />

              <label className="label mb-1.5 mt-4 block">Your Name</label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Dr. Jane Smith" />

              <label className="label mb-1.5 mt-4 block">Work Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@hospital.org" />

              <label className="label mb-1.5 mt-4 block">Password</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />

              {error && <p className="mt-3 text-[12.5px] text-coral-text">{error}</p>}

              <Button onClick={submit} disabled={submitting} className="mt-6 w-full gap-1.5 bg-navy py-5 text-white hover:bg-navy/90">
                {submitting ? "Setting up…" : "Continue to Payment"} <ArrowRight size={15} />
              </Button>
            </>
          )}
        </Card>

        <p className="mt-4 text-center text-[12px] text-muted-foreground">
          <a href="/pricing" className="hover:underline">← Back to Pricing</a>
        </p>
      </div>
    </div>
  );
}
