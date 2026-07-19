"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GraduationCap, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TIER_LIMITS } from "@/app/lib/tiers";
import type { PaidPlanTier } from "@/app/lib/supabase/types";
import type { TierCapacity } from "@/app/lib/marketing";

const PAID_TIERS: PaidPlanTier[] = ["starter", "professional", "academic"];

function formatLimit(n: number | null, unit: string) {
  return n === null ? `Unlimited ${unit}` : `${n.toLocaleString()} ${unit}`;
}

export default function PricingPage() {
  const [capacity, setCapacity] = useState<TierCapacity[] | null>(null);

  useEffect(() => {
    fetch("/api/marketing/capacity")
      .then((r) => r.json())
      .then((d) => setCapacity(d.capacity ?? []));
  }, []);

  function capacityFor(tier: PaidPlanTier) {
    return capacity?.find((c) => c.planTier === tier) ?? null;
  }

  return (
    <div className="min-h-screen bg-background px-6 py-14">
      <nav className="mx-auto mb-10 flex max-w-5xl items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-navy text-white">
            <GraduationCap size={16} />
          </span>
          <span className="font-heading text-[15px] font-bold text-foreground">Aetheris Oncology</span>
        </Link>
        <Link href="/pilot" className="text-[13px] font-medium text-muted-foreground hover:text-foreground">
          Prefer a pilot first? →
        </Link>
      </nav>

      <div className="mx-auto max-w-3xl text-center">
        <h1 className="font-heading text-[30px] font-bold tracking-tight text-foreground">Plans & Pricing</h1>
        <p className="mt-2 text-[14px] text-muted-foreground">
          Seat-based pricing per residency program. Only a limited number of institutions can purchase each tier.
        </p>
      </div>

      <div className="mx-auto mt-10 grid max-w-5xl grid-cols-3 gap-5">
        {PAID_TIERS.map((tier) => {
          const limits = TIER_LIMITS[tier];
          const cap = capacityFor(tier);
          const soldOut = cap?.soldOut ?? false;
          return (
            <Card key={tier} className="flex flex-col p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-[17px] font-semibold text-foreground">{limits.label}</h2>
                {cap && (
                  <Badge className={soldOut ? "bg-coral-tint text-coral-text" : "bg-teal-tint text-teal-deep"}>
                    {soldOut ? "Sold Out" : `${cap.remaining} of ${cap.maxInstitutions} left`}
                  </Badge>
                )}
              </div>
              <div className="mt-3 font-heading text-[28px] font-bold text-navy tnum">
                ${limits.monthlyPrice?.toLocaleString()}
                <span className="text-[13px] font-medium text-muted-foreground">/mo</span>
              </div>
              <ul className="mt-5 flex flex-col gap-2 text-[13px] text-foreground">
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-teal-deep" /> {formatLimit(limits.learnerSeatLimit, "learner seats")}
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-teal-deep" /> {formatLimit(limits.caseGenMonthlyLimit, "AI case generations / mo")}
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-teal-deep" /> {formatLimit(limits.storageLimitMb ? Math.round(limits.storageLimitMb / 1024) : null, "GB storage")}
                </li>
              </ul>
              {soldOut ? (
                <Button disabled className="mt-6 w-full bg-muted text-muted-foreground">
                  Sold Out — Request a Pilot Instead
                </Button>
              ) : (
                <Link href={`/purchase?tier=${tier}`} className="mt-6">
                  <Button className="w-full gap-1.5 bg-navy text-white hover:bg-navy/90">
                    Purchase Now <ArrowRight size={15} />
                  </Button>
                </Link>
              )}
            </Card>
          );
        })}
      </div>

      <div className="mx-auto mt-6 grid max-w-5xl grid-cols-2 gap-5">
        <Card className="p-6">
          <h2 className="font-heading text-[16px] font-semibold text-foreground">Free Pilot</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            Unlimited seats for 45 days, no cost. Get on a call with us and we'll give you a code to activate it —
            no purchase or seat availability limit.
          </p>
          <Link href="/pilot" className="mt-4 inline-block text-[13px] font-semibold text-navy hover:underline">
            Request a Pilot →
          </Link>
        </Card>
        <Card className="p-6">
          <h2 className="font-heading text-[16px] font-semibold text-foreground">Enterprise</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            Custom pricing from $15,000/mo — unlimited seats, SSO, LMS integration, and API access for large health
            systems and multi-site programs.
          </p>
          <Link href="/pilot" className="mt-4 inline-block text-[13px] font-semibold text-navy hover:underline">
            Contact Sales →
          </Link>
        </Card>
      </div>
    </div>
  );
}
