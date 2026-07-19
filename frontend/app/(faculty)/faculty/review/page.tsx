"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardCheck, CheckCircle2 } from "lucide-react";
import { Shell } from "@/app/components/shell/Shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/app/lib/supabase/AuthProvider";
import { listReviewQueue, type ReviewQueueItem } from "@/app/lib/faculty";

export default function ReviewQueuePage() {
  const { profile } = useAuth();
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const institutionId = profile?.institution_id;
    if (!institutionId) return;
    listReviewQueue(institutionId).then((list) => {
      setItems(list);
      setLoaded(true);
    });
  }, [profile?.institution_id]);

  return (
    <Shell breadcrumb="Review Queue">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="font-heading text-[24px] font-bold tracking-tight text-foreground">Review Queue</h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          Open any resident's submission to see their reasoning next to the AI's, and comment, approve, or flag a disagreement.
        </p>

        {loaded && items.length === 0 ? (
          <Card className="mt-6 flex flex-col items-center gap-2 p-10 text-center">
            <ClipboardCheck size={28} className="text-muted-foreground/50" />
            <p className="text-[13.5px] font-medium text-foreground">No completed submissions yet</p>
            <p className="max-w-sm text-[12.5px] text-muted-foreground">
              Once a resident in your institution completes a case, it will show up here for review.
            </p>
          </Card>
        ) : (
          <Card className="mt-6 p-0">
            <div className="flex flex-col divide-y divide-border">
              {items.map((item) => (
                <Link
                  key={`${item.caseId}-${item.userId}`}
                  href={`/faculty/review/${item.caseId}/${item.userId}`}
                  className="flex items-center gap-4 px-5 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-medium text-foreground">{item.title}</div>
                    <div className="text-[12px] text-muted-foreground">
                      {item.residentName} · {new Date(item.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                  </div>
                  {item.reviewed && (
                    <Badge className="bg-teal-tint text-teal-deep gap-1">
                      <CheckCircle2 size={12} /> Reviewed
                    </Badge>
                  )}
                  <div className="text-right">
                    <div className="label">Agreement</div>
                    <div className={`font-heading text-[15px] font-bold tnum ${item.agreement < 70 ? "text-coral-text" : "text-teal-deep"}`}>
                      {item.agreement}%
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        )}
      </div>
    </Shell>
  );
}
