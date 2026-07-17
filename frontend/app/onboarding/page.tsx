"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveProfile } from "../lib/profile";

const ROLES = [
  "Medical Student",
  "PGY-1 Resident",
  "PGY-2 Resident",
  "PGY-3 Resident",
  "PGY-4+ Resident",
  "Fellow",
  "Attending",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [triedSubmit, setTriedSubmit] = useState(false);

  const errors = {
    name: name.trim().length === 0,
    role: role.length === 0,
  };
  const isValid = !errors.name && !errors.role;

  function start() {
    if (!isValid) {
      setTriedSubmit(true);
      return;
    }
    saveProfile({ name: name.trim(), role, createdAt: new Date().toISOString() });
    router.replace("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-navy text-white">
            <GraduationCap size={22} />
          </div>
          <h1 className="mt-4 font-heading text-[22px] font-bold tracking-tight text-foreground">
            Welcome to Aetheris
          </h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
            An AI-powered oncology training simulator. Work synthetic patient cases through a
            structured decision worksheet, then compare your reasoning against a live multi-agent
            AI pipeline — genomic annotation, literature retrieval, survival modeling, trial
            matching, and toxicity assessment.
          </p>
        </div>

        <Card className="p-6">
          <label className="label mb-1.5 block">
            Your Name <span className="text-coral-text">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alex Rivera"
            aria-invalid={triedSubmit && errors.name}
            onKeyDown={(e) => e.key === "Enter" && start()}
          />
          {triedSubmit && errors.name && <p className="mt-1 text-[11.5px] text-coral-text">Name is required.</p>}

          <label className="label mb-1.5 mt-5 block">
            Role <span className="text-coral-text">*</span>
          </label>
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
          {triedSubmit && errors.role && <p className="mt-1.5 text-[11.5px] text-coral-text">Select a role.</p>}

          <Button onClick={start} className="mt-6 w-full gap-1.5 bg-navy py-5 text-white hover:bg-navy/90">
            Get Started <ArrowRight size={15} />
          </Button>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Stored only on this device — no account server, no password.
          </p>
        </Card>
      </div>
    </div>
  );
}
