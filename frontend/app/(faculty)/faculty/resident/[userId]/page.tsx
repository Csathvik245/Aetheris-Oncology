"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ScrollText, MessageSquare, ClipboardPlus, X, CheckCircle2 } from "lucide-react";
import { Shell } from "@/app/components/shell/Shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/app/lib/supabase/client";
import { useAuth } from "@/app/lib/supabase/AuthProvider";
import { CASES } from "@/app/lib/mock";
import { assignCase, unassignCase, listAssignmentsForResident, type CaseAssignment } from "@/app/lib/faculty";

interface ResidentProfile {
  full_name: string;
  display_role: string | null;
}

interface HistoryRow {
  case_id: string;
  title: string;
  difficulty: string;
  agreement: number;
  occurred_at: string;
}

interface FacultyCaseOption {
  id: string;
  title: string;
}

export default function ResidentDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const { profile } = useAuth();
  const [resident, setResident] = useState<ResidentProfile | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [commentCounts, setCommentCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);

  const [facultyCases, setFacultyCases] = useState<FacultyCaseOption[]>([]);
  const [assignments, setAssignments] = useState<CaseAssignment[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [note, setNote] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const caseOptions: FacultyCaseOption[] = [
    ...CASES.map((c) => ({ id: c.id, title: c.title })),
    ...facultyCases,
  ];

  function loadAssignments() {
    listAssignmentsForResident(userId).then(setAssignments);
  }

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("profiles").select("full_name, display_role").eq("id", userId).single<ResidentProfile>(),
      supabase
        .from("history_entries")
        .select("case_id, title, difficulty, agreement, occurred_at")
        .eq("user_id", userId)
        .order("occurred_at", { ascending: false })
        .returns<HistoryRow[]>(),
      supabase.from("review_comments").select("case_id").eq("submission_user_id", userId).returns<{ case_id: string }[]>(),
    ]).then(([profileRes, historyRes, commentsRes]) => {
      setResident(profileRes.data);
      setHistory(historyRes.data ?? []);
      const counts = new Map<string, number>();
      for (const row of commentsRes.data ?? []) {
        counts.set(row.case_id, (counts.get(row.case_id) ?? 0) + 1);
      }
      setCommentCounts(counts);
      setLoading(false);
    });
    loadAssignments();
  }, [userId]);

  useEffect(() => {
    if (!profile?.institution_id) return;
    const supabase = createClient();
    supabase
      .from("cases")
      .select("id, title")
      .eq("institution_id", profile.institution_id)
      .then(({ data }) => setFacultyCases(data ?? []));
  }, [profile?.institution_id]);

  async function handleAssign() {
    if (!selectedCaseId || !profile?.institution_id) return;
    const caseTitle = caseOptions.find((c) => c.id === selectedCaseId)?.title ?? selectedCaseId;
    setAssigning(true);
    setAssignError(null);
    const { error } = await assignCase({
      caseId: selectedCaseId,
      caseTitle,
      institutionId: profile.institution_id,
      assignedTo: userId,
      note,
      dueAt,
    });
    setAssigning(false);
    if (error) {
      setAssignError(error);
      return;
    }
    setSelectedCaseId("");
    setNote("");
    setDueAt("");
    loadAssignments();
  }

  async function handleUnassign(id: string) {
    await unassignCase(id);
    loadAssignments();
  }

  const avgAgreement = history.length
    ? Math.round(history.reduce((a, h) => a + h.agreement, 0) / history.length)
    : null;

  return (
    <Shell breadcrumb="Resident">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <Link href="/faculty/dashboard" className="flex items-center gap-1.5 text-[12.5px] font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>

        {!loading && resident && (
          <div className="mt-3">
            <h1 className="font-heading text-[24px] font-bold tracking-tight text-foreground">{resident.full_name}</h1>
            <p className="mt-1 text-[13.5px] text-muted-foreground">{resident.display_role ?? "Resident"}</p>
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="font-heading text-2xl font-bold text-navy tnum">{history.length}</div>
            <div className="mt-0.5 text-[12px] text-muted-foreground">Cases Completed</div>
          </Card>
          <Card className="p-4">
            <div className="font-heading text-2xl font-bold text-navy tnum">{avgAgreement !== null ? `${avgAgreement}%` : "—"}</div>
            <div className="mt-0.5 text-[12px] text-muted-foreground">Avg. Agreement with AI</div>
          </Card>
        </div>

        <Card className="mt-5 p-5">
          <h3 className="flex items-center gap-1.5 font-heading text-[15px] font-semibold text-foreground">
            <ClipboardPlus size={16} /> Assign a Case
          </h3>
          <div className="mt-3 flex items-center gap-2">
            <Select value={selectedCaseId} onValueChange={(v) => v && setSelectedCaseId(v)}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Choose a case…" /></SelectTrigger>
              <SelectContent>
                {caseOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="w-40" />
          </div>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note (e.g. focus area)" className="mt-2" />
          {assignError && <p className="mt-2 text-[12px] text-coral-text">{assignError}</p>}
          <Button onClick={handleAssign} disabled={!selectedCaseId || assigning} className="mt-3 gap-1.5 bg-navy text-white hover:bg-navy/90">
            {assigning ? "Assigning…" : "Assign Case"}
          </Button>

          {assignments.length > 0 && (
            <div className="mt-4 flex flex-col gap-2 border-t border-border pt-3">
              {assignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 text-[12.5px]">
                  <div className="min-w-0">
                    <span className="truncate font-medium text-foreground">{a.caseTitle}</span>
                    {a.note && <span className="ml-2 text-muted-foreground">— {a.note}</span>}
                    {a.dueAt && <span className="ml-2 text-muted-foreground">Due {new Date(a.dueAt).toLocaleDateString()}</span>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {a.completed ? (
                      <Badge className="flex items-center gap-1 bg-teal-tint text-teal-deep"><CheckCircle2 size={11} /> Done</Badge>
                    ) : (
                      <Badge className="bg-muted text-muted-foreground">Pending</Badge>
                    )}
                    <button onClick={() => handleUnassign(a.id)} className="text-muted-foreground hover:text-coral-text">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <h3 className="mt-6 font-heading text-[15px] font-semibold text-foreground">Completed Cases</h3>
        {!loading && history.length === 0 ? (
          <Card className="mt-3 p-6 text-center text-[12.5px] text-muted-foreground">No completed cases yet.</Card>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {history.map((h, i) => (
              <Link
                key={`${h.case_id}-${i}`}
                href={`/faculty/review/${h.case_id}/${userId}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3.5 transition-colors hover:bg-muted"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <ScrollText size={15} className="shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-foreground">{h.title}</p>
                    <p className="text-[11.5px] text-muted-foreground">
                      {new Date(h.occurred_at).toLocaleDateString()} · {h.difficulty}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {commentCounts.has(h.case_id) && (
                    <span className="flex items-center gap-1 text-[11.5px] text-muted-foreground">
                      <MessageSquare size={12} /> {commentCounts.get(h.case_id)}
                    </span>
                  )}
                  <Badge className={h.agreement < 70 ? "bg-coral-tint text-coral-text" : "bg-teal-tint text-teal-deep"}>
                    {h.agreement}%
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
