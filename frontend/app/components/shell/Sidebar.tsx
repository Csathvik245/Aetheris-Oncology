"use client";

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
import { RESIDENT } from "@/app/lib/mock";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, match: (p: string) => p === "/" },
  { href: "/cases", label: "Case Library", icon: LibraryBig, match: (p: string) => p.startsWith("/cases") },
  { href: "/generator", label: "Case Generator", icon: FlaskConical, match: (p: string) => p.startsWith("/generator") },
  { href: "/history", label: "Practice History", icon: History, match: (p: string) => p.startsWith("/history") },
  { href: "/competency", label: "Competency Profile", icon: Radar, match: (p: string) => p.startsWith("/competency") },
];

export function Sidebar() {
  const pathname = usePathname();

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
          href="#"
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Settings size={18} strokeWidth={2} />
          Settings
        </Link>
        <div className="flex items-center gap-3 border-t border-border pt-4">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-navy text-[12px] font-semibold text-white">
              {RESIDENT.name
                .split(" ")
                .filter((w) => w[0] === w[0]?.toUpperCase())
                .map((w) => w[0])
                .join("")
                .slice(-2)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold text-foreground">{RESIDENT.name}</div>
            <div className="truncate text-[11.5px] text-muted-foreground">{RESIDENT.role}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
