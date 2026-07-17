"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { getProfile } from "../../lib/profile";

export function Shell({
  children,
  breadcrumb,
  streakDays,
}: {
  children: React.ReactNode;
  breadcrumb?: string;
  streakDays?: number;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (getProfile()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReady(true);
    } else {
      router.replace("/onboarding");
    }
  }, [router]);

  if (!ready) return null;

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
