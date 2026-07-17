"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2 } from "lucide-react";
import { Shell } from "../components/shell/Shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getProfile, saveProfile, type Profile } from "../lib/profile";
import { getPreferences, savePreferences, type Preferences } from "../lib/preferences";
import { resetAllProgress } from "../lib/session";

const ROLES = [
  "Medical Student",
  "PGY-1 Resident",
  "PGY-2 Resident",
  "PGY-3 Resident",
  "PGY-4+ Resident",
  "Fellow",
  "Attending",
];

const DIFFICULTY_OPTIONS = ["All", "Beginner", "Intermediate", "Advanced"];
const MONITORING_OPTIONS: { value: Preferences["defaultMonitoring"]; label: string }[] = [
  { value: "weekly-cbc", label: "Weekly CBC + CMP" },
  { value: "biweekly-cbc", label: "Biweekly CBC + CMP" },
  { value: "monthly-imaging", label: "Monthly Restaging Imaging" },
];

export default function SettingsPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);
  const [prefs, setPrefs] = useState<Preferences>({ defaultCaseDifficulty: "All", defaultMonitoring: "weekly-cbc" });

  useEffect(() => {
    const p = getProfile();
    if (p) {
      // One-shot bootstrap read from localStorage (unavailable during SSR).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(p.name);
      setRole(p.role);
    }
    setPrefs(getPreferences());
  }, []);

  function saveProfileChanges() {
    const trimmed = name.trim();
    if (!trimmed || !role) return;
    const existing = getProfile();
    const profile: Profile = { name: trimmed, role, createdAt: existing?.createdAt ?? new Date().toISOString() };
    saveProfile(profile);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 1800);
  }

  function updatePrefs(patch: Partial<Preferences>) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    savePreferences(next);
  }

  function resetData() {
    const confirmed = window.confirm(
      "This clears every generated case, worksheet submission, saved draft, and practice history on this device. Your profile stays. This can't be undone — continue?"
    );
    if (!confirmed) return;
    resetAllProgress();
    router.push("/");
  }

  return (
    <Shell breadcrumb="Settings">
      <div className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="font-heading text-[24px] font-bold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          Everything here is stored on this device only — no account server.
        </p>

        <Card className="mt-6 p-6">
          <h3 className="font-heading text-[15px] font-semibold text-foreground">Profile</h3>
          <label className="label mb-1.5 mt-4 block">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />

          <label className="label mb-1.5 mt-4 block">Role</label>
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`rounded-lg border px-3 py-2 text-left text-[12.5px] font-medium transition-colors ${
                  role === r ? "border-navy bg-navy-tint text-navy" : "border-border text-foreground hover:bg-muted"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="mt-5 flex items-center gap-3">
            <Button onClick={saveProfileChanges} disabled={!name.trim() || !role} className="bg-navy text-white hover:bg-navy/90">
              Save Changes
            </Button>
            {profileSaved && (
              <span className="flex items-center gap-1 text-[12.5px] font-medium text-teal-deep">
                <Check size={14} /> Saved
              </span>
            )}
          </div>
        </Card>

        <Card className="mt-5 p-6">
          <h3 className="font-heading text-[15px] font-semibold text-foreground">Preferences</h3>

          <label className="label mb-1.5 mt-4 block">Default Case Library Difficulty Filter</label>
          <Select value={prefs.defaultCaseDifficulty} onValueChange={(v) => v && updatePrefs({ defaultCaseDifficulty: v as Preferences["defaultCaseDifficulty"] })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIFFICULTY_OPTIONS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d === "All" ? "All Difficulty" : d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1.5 text-[11.5px] text-muted-foreground">
            Applied automatically when you open the Case Library.
          </p>

          <label className="label mb-1.5 mt-5 block">Default Worksheet Monitoring Strategy</label>
          <Select value={prefs.defaultMonitoring} onValueChange={(v) => v && updatePrefs({ defaultMonitoring: v as Preferences["defaultMonitoring"] })}>
            <SelectTrigger className="w-full">
              <SelectValue>{(v: string) => MONITORING_OPTIONS.find((o) => o.value === v)?.label ?? v}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {MONITORING_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1.5 text-[11.5px] text-muted-foreground">
            Pre-selected in Treatment Planning for new worksheets (a saved draft&rsquo;s own
            monitoring choice still wins).
          </p>
        </Card>

        <Card className="mt-5 border-coral-ring p-6">
          <h3 className="font-heading text-[15px] font-semibold text-coral-text">Reset Practice Data</h3>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
            Clears every generated case, worksheet submission, saved draft, and practice history on
            this device. Your profile is not affected.
          </p>
          <Button
            onClick={resetData}
            variant="outline"
            className="mt-4 gap-1.5 border-coral-ring text-coral-text hover:bg-coral-tint"
          >
            <Trash2 size={14} /> Reset All Practice Data
          </Button>
        </Card>
      </div>
    </Shell>
  );
}
