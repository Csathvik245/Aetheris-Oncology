"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  LibraryBig,
  FlaskConical,
  History,
  Radar,
  Settings,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getProfile, initials, type Profile } from "@/app/lib/profile";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, match: (p: string) => p === "/" },
  { href: "/cases", label: "Case Library", icon: LibraryBig, match: (p: string) => p.startsWith("/cases") },
  { href: "/generator", label: "Case Generator", icon: FlaskConical, match: (p: string) => p.startsWith("/generator") },
  { href: "/history", label: "Practice History", icon: History, match: (p: string) => p.startsWith("/history") },
  { href: "/competency", label: "Competency Profile", icon: Radar, match: (p: string) => p.startsWith("/competency") },
];

export function Sidebar() {
  const pathname = usePathname();
  const settingsActive = pathname.startsWith("/settings");
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    // Shell already gates on a profile existing before mounting Sidebar,
    // so this is just the client-side read (localStorage isn't available
    // during SSR).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfile(getProfile());
  }, []);

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col justify-between border-r border-border bg-background px-4 py-5">
      <div className="flex flex-col gap-8">
        <div>
          <div className="font-heading text-xl font-bold tracking-tight text-navy">Aetheris</div>
          <div className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Oncology Training
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon, match }) => {
            const active = match(pathname);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] transition-colors ${
                  active
                    ? "bg-navy-tint font-semibold text-navy"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon size={18} strokeWidth={2} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-3">
        <Link
          href="/settings"
          className={`flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] transition-colors ${
            settingsActive
              ? "bg-navy-tint font-semibold text-navy"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Settings size={18} strokeWidth={2} />
          Settings
        </Link>
        {profile && (
          <Link
            href="/settings"
            className="flex items-center gap-3 rounded-xl border-t border-border px-3 pt-4 hover:bg-muted"
          >
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-navy text-[12px] font-semibold text-white">
                {initials(profile.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold text-foreground">{profile.name}</div>
              <div className="truncate text-[11.5px] text-muted-foreground">{profile.role}</div>
            </div>
          </Link>
        )}
      </div>
    </aside>
  );
}
