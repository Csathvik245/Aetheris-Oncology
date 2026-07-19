"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Store, Heart, CheckCircle2, Clock } from "lucide-react";
import { Shell } from "../components/shell/Shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "../lib/supabase/client";

interface MarketplaceCase {
  id: string;
  title: string;
  chief_complaint: string;
  difficulty: string;
  est_minutes: number;
  verified: boolean;
  favorite_count: number;
  source: string;
}

export default function MarketplacePage() {
  const [cases, setCases] = useState<MarketplaceCase[]>([]);
  const [favorited, setFavorited] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  async function load() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: rows } = await supabase
      .from("cases")
      .select("id, title, chief_complaint, difficulty, est_minutes, verified, favorite_count, source")
      .eq("visibility", "marketplace")
      .order("favorite_count", { ascending: false })
      .returns<MarketplaceCase[]>();

    setCases(rows ?? []);

    if (user) {
      const { data: favs } = await supabase.from("case_favorites").select("case_id").eq("user_id", user.id);
      setFavorited(new Set((favs ?? []).map((f) => f.case_id)));
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleFavorite(caseId: string) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (favorited.has(caseId)) {
      await supabase.from("case_favorites").delete().eq("user_id", user.id).eq("case_id", caseId);
    } else {
      await supabase.from("case_favorites").insert({ user_id: user.id, case_id: caseId });
    }
    await load();
  }

  return (
    <Shell breadcrumb="Case Marketplace">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-navy text-white">
            <Store size={17} />
          </span>
          <div>
            <h1 className="font-heading text-[24px] font-bold tracking-tight text-foreground">Case Marketplace</h1>
            <p className="text-[13px] text-muted-foreground">Cases shared publicly by faculty and residents across programs.</p>
          </div>
        </div>

        {!loading && cases.length === 0 && (
          <Card className="mt-6 p-6 text-[13px] text-muted-foreground">
            No cases published to the marketplace yet — publish one from any case's detail page.
          </Card>
        )}

        <div className="mt-6 grid grid-cols-3 gap-5">
          {cases.map((c) => (
            <Card key={c.id} className="flex h-full flex-col p-5">
              <div className="flex items-center justify-between">
                <Badge className="bg-navy-tint text-navy">{c.difficulty}</Badge>
                {c.verified && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-teal-deep">
                    <CheckCircle2 size={13} /> Faculty Verified
                  </span>
                )}
              </div>
              <Link href={`/cases/${c.id}`} className="mt-3 flex-1">
                <h3 className="font-heading text-[15.5px] font-semibold leading-snug text-foreground hover:underline">{c.title}</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">{c.chief_complaint}</p>
              </Link>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
                  <Clock size={13} /> {c.est_minutes} mins
                </span>
                <button
                  onClick={() => toggleFavorite(c.id)}
                  className={`flex items-center gap-1 text-[12px] font-medium ${favorited.has(c.id) ? "text-coral-text" : "text-muted-foreground"}`}
                >
                  <Heart size={14} fill={favorited.has(c.id) ? "currentColor" : "none"} /> {c.favorite_count}
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Shell>
  );
}
