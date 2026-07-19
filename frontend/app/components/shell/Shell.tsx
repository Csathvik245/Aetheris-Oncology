"use client";

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

  if (loading || !profile) return null;

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
