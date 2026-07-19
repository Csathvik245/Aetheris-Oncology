"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  LibraryBig,
  FlaskConical,
  History,
  Radar,
  Settings,
  GraduationCap,
  ClipboardCheck,
  FilePlus2,
  CreditCard,
  LogOut,
  Route,
  BrainCircuit,
  ScrollText,
  Trophy,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/app/lib/profile";
import { useAuth } from "@/app/lib/supabase/AuthProvider";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, match: (p: string) => p === "/" },
  { href: "/cases", label: "Case Library", icon: LibraryBig, match: (p: string) => p.startsWith("/cases") },
  { href: "/generator", label: "Case Generator", icon: FlaskConical, match: (p: string) => p.startsWith("/generator") },
  { href: "/exams", label: "Board Exam Mode", icon: ScrollText, match: (p: string) => p.startsWith("/exams") },
  { href: "/curriculum", label: "Adaptive Curriculum", icon: Route, match: (p: string) => p.startsWith("/curriculum") },
  { href: "/mentor", label: "AI Mentor", icon: BrainCircuit, match: (p: string) => p.startsWith("/mentor") },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy, match: (p: string) => p.startsWith("/leaderboard") },
  { href: "/history", label: "Practice History", icon: History, match: (p: string) => p.startsWith("/history") },
  { href: "/competency", label: "Competency Profile", icon: Radar, match: (p: string) => p.startsWith("/competency") },
];

const FACULTY_NAV = [
  { href: "/faculty/dashboard", label: "Faculty Dashboard", icon: GraduationCap, match: (p: string) => p.startsWith("/faculty/dashboard") },
  { href: "/faculty/review", label: "Review Queue", icon: ClipboardCheck, match: (p: string) => p.startsWith("/faculty/review") },
  { href: "/faculty/cases/new", label: "Case Builder", icon: FilePlus2, match: (p: string) => p.startsWith("/faculty/cases") },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy, match: (p: string) => p.startsWith("/leaderboard") },
  { href: "/faculty/billing", label: "Billing", icon: CreditCard, match: (p: string) => p.startsWith("/faculty/billing") },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const settingsActive = pathname.startsWith("/settings");
  const { profile, signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

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
          {(profile?.role === "resident" ? NAV : FACULTY_NAV).map(({ href, label, icon: Icon, match }) => {
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
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut size={18} strokeWidth={2} />
          Sign Out
        </button>
        {profile && (
          <Link
            href="/settings"
            className="flex items-center gap-3 rounded-xl border-t border-border px-3 pt-4 hover:bg-muted"
          >
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-navy text-[12px] font-semibold text-white">
                {profile.avatar_initials ?? initials(profile.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold text-foreground">{profile.full_name}</div>
              <div className="truncate text-[11.5px] text-muted-foreground">
                {profile.display_role ?? profile.role}
              </div>
            </div>
          </Link>
        )}
      </div>
    </aside>
  );
}
