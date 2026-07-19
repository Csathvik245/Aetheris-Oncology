"use client";

import { usePathname } from "next/navigation";
import { Lock } from "lucide-react";
import { useAuth } from "../../lib/supabase/AuthProvider";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function Shell({
  children,
  breadcrumb,
  streakDays,
}: {
  children: React.ReactNode;
  breadcrumb?: string;
  streakDays?: number;
}) {
  // proxy.ts already redirects unauthenticated requests to /login before
  // this ever renders — `loading` here just covers the brief client-side
  // hydration window while the profile row is fetched.
  const { loading, profile } = useAuth();
  const pathname = usePathname();

  if (loading || !profile) return null;

  // Lazy Free Pilot expiry check — re-evaluated on every authenticated page
  // load rather than via a scheduled job, since the institution's
  // free_pilot_expires_at timestamp is the single source of truth. Billing
  // stays reachable so an admin can actually upgrade out of this state.
  const institution = profile.institution;
  const pilotExpired =
    institution?.plan_tier === "free_pilot" &&
    !!institution.free_pilot_expires_at &&
    new Date(institution.free_pilot_expires_at).getTime() < Date.now();

  if (pilotExpired && pathname !== "/faculty/billing") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background px-6">
        <div className="max-w-sm text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-coral-tint text-coral-text">
            <Lock size={22} />
          </div>
          <h1 className="mt-4 font-heading text-[19px] font-bold tracking-tight text-foreground">
            Free pilot has ended
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            {profile.role === "admin"
              ? "Your institution's 45-day free pilot has ended. Upgrade to a paid plan to keep using Aetheris."
              : "Your institution's free pilot has ended. Ask your program admin to upgrade the plan."}
          </p>
          {profile.role === "admin" && (
            <a
              href="/faculty/billing"
              className="mt-5 inline-block rounded-lg bg-navy px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-navy/90"
            >
              Go to Billing
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-background text-foreground">
      <Sidebar />
      <div className="flex min-h-0 flex-1 flex-col">
        <TopBar breadcrumb={breadcrumb} streakDays={streakDays} />
        <main className="min-h-0 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
