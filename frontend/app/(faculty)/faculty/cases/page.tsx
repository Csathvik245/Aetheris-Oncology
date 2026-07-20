"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FilePlus2, Pencil, Eye } from "lucide-react";
import { Shell } from "@/app/components/shell/Shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/app/lib/supabase/AuthProvider";
import { createClient } from "@/app/lib/supabase/client";

interface OwnedCase {
  id: string;
  title: string;
  difficulty: string;
  visibility: string;
  favorite_count: number;
  created_at: string;
}

export default function MyCasesPage() {
  const { profile, loading } = useAuth();
  const [cases, setCases] = useState<OwnedCase[] | null>(null);

  useEffect(() => {
    if (loading || !profile) return;
    const supabase = createClient();
    supabase
      .from("cases")
      .select("id, title, difficulty, visibility, favorite_count, created_at")
      .eq("owner_id", profile.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setCases(data ?? []));
  }, [loading, profile]);

  return (
    <Shell breadcrumb="My Cases">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-[22px] font-bold tracking-tight text-foreground">My Cases</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">Cases you've authored for your institution.</p>
          </div>
          <Link href="/faculty/cases/new">
            <Button className="gap-1.5 bg-navy text-white hover:bg-navy/90">
              <FilePlus2 size={15} /> New Case
            </Button>
          </Link>
        </div>

        {cases === null ? null : cases.length === 0 ? (
          <Card className="mt-6 flex flex-col items-center gap-2 p-10 text-center">
            <FilePlus2 size={28} className="text-muted-foreground/50" />
            <p className="text-[13.5px] font-medium text-foreground">No cases yet</p>
            <p className="max-w-sm text-[12.5px] text-muted-foreground">
              Author your first case — it'll be available to every resident at your institution.
            </p>
          </Card>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            {cases.map((c) => (
              <Card key={c.id} className="flex items-center justify-between p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[13.5px] font-medium text-foreground">{c.title}</p>
                    <Badge className="bg-navy-tint text-navy">{c.difficulty}</Badge>
                    <Badge className="bg-muted text-muted-foreground">{c.visibility}</Badge>
                  </div>
                  <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                    {c.favorite_count} favorite{c.favorite_count === 1 ? "" : "s"} · {new Date(c.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link href={`/cases/${c.id}`}>
                    <Button variant="outline" className="gap-1.5">
                      <Eye size={14} /> View
                    </Button>
                  </Link>
                  <Link href={`/faculty/cases/${c.id}/edit`}>
                    <Button variant="outline" className="gap-1.5">
                      <Pencil size={14} /> Edit
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
