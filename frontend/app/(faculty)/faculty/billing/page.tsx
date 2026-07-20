"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Mail, Copy, RefreshCw, Check } from "lucide-react";
import { Shell } from "@/app/components/shell/Shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/app/lib/supabase/AuthProvider";
import { createClient } from "@/app/lib/supabase/client";
import { TIER_LIMITS, FREE_PILOT_DAYS } from "@/app/lib/tiers";
import type { PlanTier } from "@/app/lib/supabase/types";

const PAID_TIERS: { tier: PlanTier; blurb: string }[] = [
  { tier: "starter", blurb: "Small fellowship program" },
  { tier: "professional", blurb: "Mid-size academic program" },
  { tier: "academic", blurb: "Large cancer center / multiple fellowship tracks" },
];

function UsageBar({ label, used, limit, unit }: { label: string; used: number; limit: number | null; unit?: string }) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-[12.5px]">
        <span className="font-medium text-foreground">{label}</span>
        <span className="tnum text-muted-foreground">
          {used.toLocaleString()} {limit ? `/ ${limit.toLocaleString()}${unit ?? ""}` : "· Unlimited"}
        </span>
      </div>
      {limit != null && <Progress value={pct} className="mt-1.5" />}
    </div>
  );
}

export default function BillingPage() {
  const { profile, refreshProfile } = useAuth();
  const searchParams = useSearchParams();
  const [residentCount, setResidentCount] = useState<number | null>(null);
  const [loadingTier, setLoadingTier] = useState<PlanTier | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const checkoutResult = searchParams.get("checkout");

  const institution = profile?.institution ?? null;
  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    if (!institution) return;
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("institution_id", institution.id)
      .eq("role", "resident")
      .then(({ count }) => setResidentCount(count ?? 0));
  }, [institution]);

  useEffect(() => {
    if (checkoutResult === "success") refreshProfile();
  }, [checkoutResult, refreshProfile]);

  async function upgrade(tier: PlanTier) {
    if (tier !== "starter" && tier !== "professional" && tier !== "academic") return;
    setError(null);
    setLoadingTier(tier);
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier }),
    });
    const data = await res.json();
    setLoadingTier(null);
    if (!res.ok) {
      setError(data.error ?? "Could not start checkout.");
      return;
    }
    window.location.href = data.url;
  }

  function residentLink() {
    if (!institution) return "";
    return `${window.location.origin}/signup?role=resident&joinCode=${institution.join_code}`;
  }

  function copyJoinCode() {
    if (!institution) return;
    navigator.clipboard.writeText(residentLink());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function regenerateJoinCode() {
    setRegenerating(true);
    await fetch("/api/institution/join-code", { method: "POST" });
    await refreshProfile();
    setRegenerating(false);
  }

  if (!institution) {
    return (
      <Shell breadcrumb="Billing">
        <div className="mx-auto max-w-3xl px-6 py-8" />
      </Shell>
    );
  }

  const currentLimits = TIER_LIMITS[institution.plan_tier];
  const daysLeft = institution.free_pilot_expires_at
    ? Math.max(0, Math.ceil((new Date(institution.free_pilot_expires_at).getTime() - Date.now()) / 86_400_000))
    : null;

  return (
    <Shell breadcrumb="Billing">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="font-heading text-[24px] font-bold tracking-tight text-foreground">Billing</h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">{institution.name}</p>

        {checkoutResult === "success" && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-teal-tint px-4 py-3 text-[12.5px] font-medium text-teal-deep">
            <CheckCircle2 size={16} /> Subscription active — thanks!
          </div>
        )}
        {checkoutResult === "canceled" && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-coral-tint px-4 py-3 text-[12.5px] font-medium text-coral-text">
            <XCircle size={16} /> Checkout canceled — no changes were made.
          </div>
        )}

        {institution.plan_tier === "free_pilot" && daysLeft !== null && (
          <Card className="mt-6 border-coral-ring p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-heading text-[15px] font-semibold text-coral-text">Free Pilot</div>
                <p className="mt-1 text-[12.5px] text-muted-foreground">
                  {daysLeft > 0
                    ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} remaining on your ${FREE_PILOT_DAYS}-day trial — unlimited seats and usage.`
                    : "Your free pilot has ended. Upgrade below to keep using Aetheris."}
                </p>
              </div>
            </div>
          </Card>
        )}

        <Card className="mt-5 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-[15px] font-semibold text-foreground">Current Plan</h3>
            <span className="rounded-full bg-navy-tint px-3 py-1 text-[11.5px] font-semibold uppercase tracking-wide text-navy">
              {TIER_LIMITS[institution.plan_tier].label}
            </span>
          </div>
          <div className="mt-4 flex flex-col gap-4">
            <UsageBar label="Learner Seats" used={residentCount ?? 0} limit={currentLimits.learnerSeatLimit} />
            <UsageBar
              label="Case Generations (this period)"
              used={institution.case_gen_used_this_period}
              limit={currentLimits.caseGenMonthlyLimit}
              unit="/mo"
            />
            <UsageBar
              label="Storage"
              used={Math.round(institution.storage_used_mb)}
              limit={currentLimits.storageLimitMb}
              unit=" MB"
            />
          </div>
        </Card>

        {isAdmin && (
          <Card className="mt-5 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading text-[15px] font-semibold text-foreground">Resident Invite Link</h3>
                <p className="mt-1 text-[12.5px] text-muted-foreground">
                  Share this with your residents/faculty — they click it, create their account, and are linked to{" "}
                  {institution.name} automatically.
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg bg-navy-tint px-3 py-2 text-[12.5px] text-navy">
                {residentLink()}
              </code>
              <Button variant="outline" onClick={copyJoinCode} className="shrink-0 gap-1.5">
                {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
              </Button>
              <Button variant="outline" onClick={regenerateJoinCode} disabled={regenerating} className="shrink-0 gap-1.5">
                <RefreshCw size={14} className={regenerating ? "animate-spin" : ""} /> Regenerate
              </Button>
            </div>
          </Card>
        )}

        {isAdmin && (
          <>
            <h3 className="mt-8 font-heading text-[15px] font-semibold text-foreground">Available Plans</h3>
            {error && <p className="mt-2 text-[12.5px] text-coral-text">{error}</p>}
            <div className="mt-3 grid grid-cols-3 gap-4">
              {PAID_TIERS.map(({ tier, blurb }) => {
                const limits = TIER_LIMITS[tier];
                const active = institution.plan_tier === tier;
                return (
                  <Card key={tier} className={`p-5 ${active ? "border-navy" : ""}`}>
                    <div className="font-heading text-[14px] font-semibold text-foreground">{limits.label}</div>
                    <p className="mt-1 text-[11.5px] text-muted-foreground">{blurb}</p>
                    <div className="mt-3 font-heading text-2xl font-bold tnum text-navy">
                      ${limits.monthlyPrice?.toLocaleString()}
                      <span className="text-[12px] font-normal text-muted-foreground">/mo</span>
                    </div>
                    <ul className="mt-3 flex flex-col gap-1 text-[11.5px] text-muted-foreground">
                      <li>{limits.learnerSeatLimit} learner seats</li>
                      <li>{limits.caseGenMonthlyLimit?.toLocaleString() ?? "Unlimited"} case-gens/mo</li>
                      <li>{Math.round((limits.storageLimitMb ?? 0) / 1024)} GB storage</li>
                    </ul>
                    <Button
                      onClick={() => upgrade(tier)}
                      disabled={active || loadingTier === tier}
                      className="mt-4 w-full bg-navy text-white hover:bg-navy/90 disabled:opacity-50"
                    >
                      {active ? "Current Plan" : loadingTier === tier ? "Redirecting…" : "Upgrade"}
                    </Button>
                  </Card>
                );
              })}
            </div>

            <Card className="mt-4 flex items-center justify-between p-5">
              <div>
                <div className="font-heading text-[14px] font-semibold text-foreground">Enterprise</div>
                <p className="mt-1 text-[11.5px] text-muted-foreground">
                  Multi-site health systems or institutions with multiple oncology programs — starting at
                  $15,000+/mo, custom SSO/LMS/API access.
                </p>
              </div>
              <a href="mailto:sales@aetherisoncology.com?subject=Enterprise%20plan%20inquiry">
                <Button variant="outline" className="gap-1.5">
                  <Mail size={14} /> Contact Sales
                </Button>
              </a>
            </Card>
          </>
        )}
      </div>
    </Shell>
  );
}
