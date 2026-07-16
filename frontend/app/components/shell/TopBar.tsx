"use client";

import { Search, Bell, HelpCircle, Flame } from "lucide-react";
import { Input } from "@/components/ui/input";

export function TopBar({
  breadcrumb,
  streakDays,
}: {
  /** Breadcrumb-style title (e.g. "Aetheris > Case Generator"). Omit for the default global search bar. */
  breadcrumb?: string;
  streakDays?: number;
}) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-6">
      {breadcrumb ? (
        <div className="font-heading text-[15px] font-semibold text-foreground">{breadcrumb}</div>
      ) : (
        <div className="relative w-full max-w-md">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search medical cases, biomarkers, or organ systems..."
            className="h-9 rounded-xl border-border bg-card pl-9 text-[13px] shadow-none"
          />
        </div>
      )}

      <div className="flex shrink-0 items-center gap-3">
        {streakDays != null && (
          <span className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-navy">
            <Flame size={13} className="text-coral-text" />
            {streakDays} Day Streak
          </span>
        )}
        <button className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
          <Bell size={17} />
        </button>
        <button className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
          <HelpCircle size={17} />
        </button>
      </div>
    </header>
  );
}
