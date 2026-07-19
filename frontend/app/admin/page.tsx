"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Copy, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/app/lib/supabase/AuthProvider";
import type { PlanTier, PilotCode, PilotRequest } from "@/app/lib/supabase/types";
import type { TierCapacity } from "@/app/lib/marketing";

const TIER_OPTIONS: PlanTier[] = ["free_pilot", "starter", "professional", "academic"];

export default function AdminPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [capacity, setCapacity] = useState<TierCapacity[]>([]);
  const [capDrafts, setCapDrafts] = useState<Record<string, string>>({});
  const [requests, setRequests] = useState<PilotRequest[]>([]);
  const [codes, setCodes] = useState<PilotCode[]>([]);

  const [genTier, setGenTier] = useState<PlanTier>("free_pilot");
  const [genInstitutionQuery, setGenInstitutionQuery] = useState("");
  const [genInstitutionMatches, setGenInstitutionMatches] = useState<{ id: string; name: string }[]>([]);
  const [genTargetId, setGenTargetId] = useState<string | null>(null);
  const [genNotes, setGenNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [justGenerated, setJustGenerated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || !profile?.is_platform_admin)) {
      router.replace("/");
    }
  }, [loading, user, profile, router]);

  async function loadAll() {
    const [capRes, reqRes, codeRes] = await Promise.all([
      fetch("/api/admin/capacity"),
      fetch("/api/admin/pilot-requests"),
      fetch("/api/admin/pilot-codes"),
    ]);
    const [capData, reqData, codeData] = await Promise.all([capRes.json(), reqRes.json(), codeRes.json()]);
    if (capRes.ok) setCapacity(capData.capacity ?? []);
    if (reqRes.ok) setRequests(reqData.requests ?? []);
    if (codeRes.ok) setCodes(codeData.codes ?? []);
  }

  useEffect(() => {
    if (!loading && user && profile?.is_platform_admin) loadAll();
  }, [loading, user, profile]);

  useEffect(() => {
    if (genInstitutionQuery.trim().length < 2) {
      setGenInstitutionMatches([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/institutions/search?q=${encodeURIComponent(genInstitutionQuery)}`)
        .then((r) => r.json())
        .then((d) => setGenInstitutionMatches(d.institutions ?? []));
    }, 250);
    return () => clearTimeout(t);
  }, [genInstitutionQuery]);

  async function saveCapacity(tier: string) {
    const raw = capDrafts[tier];
    const maxInstitutions = Number(raw);
    if (!Number.isFinite(maxInstitutions) || maxInstitutions < 0) return;
    await fetch("/api/admin/capacity", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planTier: tier, maxInstitutions }),
    });
    loadAll();
  }

  async function updateRequestStatus(id: string, status: string) {
    await fetch("/api/admin/pilot-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    loadAll();
  }

  async function generateCode() {
    setError(null);
    setGenerating(true);
    setJustGenerated(null);
    const res = await fetch("/api/admin/pilot-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planTier: genTier, targetInstitutionId: genTargetId, notes: genNotes.trim() || undefined }),
    });
    const data = await res.json();
    setGenerating(false);
    if (!res.ok) {
      setError(data.error ?? "Could not generate a code.");
      return;
    }
    setJustGenerated(data.code.code);
    setGenNotes("");
    setGenTargetId(null);
    setGenInstitutionQuery("");
    loadAll();
  }

  if (loading || !user || !profile?.is_platform_admin) return null;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-navy text-white">
          <ShieldAlert size={17} />
        </span>
        <div>
          <h1 className="font-heading text-[22px] font-bold tracking-tight text-foreground">Founder Admin</h1>
          <p className="text-[13px] text-muted-foreground">Seat caps, pilot requests, and redemption codes.</p>
        </div>
      </div>

      <Card className="mb-6 p-6">
        <h2 className="font-heading text-[15px] font-semibold text-foreground">Seat Caps</h2>
        <div className="mt-3 flex flex-col gap-2">
          {capacity.map((c) => (
            <div key={c.planTier} className="flex items-center gap-3 rounded-lg border border-border p-3">
              <span className="w-28 text-[13px] font-medium capitalize text-foreground">{c.planTier}</span>
              <span className="text-[12px] text-muted-foreground">{c.activeCount} active</span>
              <Input
                type="number"
                className="w-20"
                defaultValue={c.maxInstitutions}
                onChange={(e) => setCapDrafts((d) => ({ ...d, [c.planTier]: e.target.value }))}
              />
              <Button variant="outline" onClick={() => saveCapacity(c.planTier)}>Save</Button>
              <Badge className={c.soldOut ? "bg-coral-tint text-coral-text" : "bg-teal-tint text-teal-deep"}>
                {c.remaining} remaining
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mb-6 p-6">
        <h2 className="font-heading text-[15px] font-semibold text-foreground">Generate a Pilot Code</h2>
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <label className="w-32 text-[12.5px] text-muted-foreground">Plan Tier</label>
            <Select value={genTier} onValueChange={(v) => v && setGenTier(v as PlanTier)}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIER_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <label className="w-32 text-[12.5px] text-muted-foreground">Restrict to institution</label>
            <div className="relative flex-1">
              <Input
                value={genTargetId ? genInstitutionQuery : genInstitutionQuery}
                onChange={(e) => { setGenInstitutionQuery(e.target.value); setGenTargetId(null); }}
                placeholder="Search to upgrade a specific institution (optional)"
              />
              {genInstitutionMatches.length > 0 && !genTargetId && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-card shadow-md">
                  {genInstitutionMatches.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { setGenTargetId(m.id); setGenInstitutionQuery(m.name); setGenInstitutionMatches([]); }}
                      className="block w-full px-3 py-2 text-left text-[12.5px] hover:bg-muted"
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="w-32 text-[12.5px] text-muted-foreground">Notes</label>
            <Input value={genNotes} onChange={(e) => setGenNotes(e.target.value)} placeholder="e.g. call with Dr. X on 7/19" className="flex-1" />
          </div>
          {error && <p className="text-[12.5px] text-coral-text">{error}</p>}
          <Button onClick={generateCode} disabled={generating} className="w-fit bg-navy text-white hover:bg-navy/90">
            {generating ? "Generating…" : "Generate Code"}
          </Button>
          {justGenerated && (
            <div className="flex items-center gap-2 rounded-lg bg-teal-tint px-3 py-2">
              <code className="text-[14px] font-bold tracking-wider text-teal-deep">{justGenerated}</code>
              <button
                onClick={() => { navigator.clipboard.writeText(justGenerated); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                className="text-teal-deep"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          )}
        </div>
      </Card>

      <Card className="mb-6 p-6">
        <h2 className="font-heading text-[15px] font-semibold text-foreground">Pilot Requests</h2>
        <div className="mt-3 flex flex-col divide-y divide-border">
          {requests.length === 0 && <p className="py-3 text-[12.5px] text-muted-foreground">No requests yet.</p>}
          {requests.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-foreground">{r.institution_name}</p>
                <p className="truncate text-[12px] text-muted-foreground">{r.contact_name} · {r.contact_email}{r.phone ? ` · ${r.phone}` : ""}</p>
                {r.message && <p className="mt-0.5 truncate text-[11.5px] italic text-muted-foreground">"{r.message}"</p>}
              </div>
              <Select value={r.status} onValueChange={(v) => v && updateRequestStatus(r.id, v)}>
                <SelectTrigger className="w-32 shrink-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">new</SelectItem>
                  <SelectItem value="contacted">contacted</SelectItem>
                  <SelectItem value="closed">closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-heading text-[15px] font-semibold text-foreground">Pilot Codes</h2>
        <div className="mt-3 flex flex-col divide-y divide-border">
          {codes.length === 0 && <p className="py-3 text-[12.5px] text-muted-foreground">No codes generated yet.</p>}
          {codes.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <code className="text-[13px] font-bold tracking-wider text-foreground">{c.code}</code>
                <span className="ml-2 text-[12px] capitalize text-muted-foreground">{c.plan_tier}</span>
                {c.notes && <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">{c.notes}</p>}
              </div>
              <Badge className={c.redeemed_at ? "bg-muted text-muted-foreground" : "bg-teal-tint text-teal-deep"}>
                {c.redeemed_at ? "Redeemed" : "Unredeemed"}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
