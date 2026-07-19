"use client";

import Link from "next/link";
import { GraduationCap, Stethoscope, Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-6 py-16">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-navy text-white">
        <GraduationCap size={26} />
      </div>
      <h1 className="mt-5 max-w-xl text-center font-heading text-[32px] font-bold tracking-tight text-foreground">
        Aetheris Oncology
      </h1>
      <p className="mt-3 max-w-lg text-center text-[15px] leading-relaxed text-muted-foreground">
        An AI-powered oncology training simulator. Work synthetic patient cases through a structured
        decision worksheet, then compare your reasoning against a live multi-agent AI pipeline.
      </p>

      <div className="mt-10 grid w-full max-w-2xl grid-cols-2 gap-5">
        <Card className="flex flex-col items-start p-6">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-navy-tint text-navy">
            <Stethoscope size={20} />
          </span>
          <h2 className="mt-4 font-heading text-[17px] font-semibold text-foreground">Residents & Fellows</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            Practice cases, take board exams, get an adaptive curriculum, and a persistent AI mentor
            that remembers your weak spots.
          </p>
          <Link href="/login?role=resident" className="mt-5 w-full">
            <Button className="w-full gap-1.5 bg-navy text-white hover:bg-navy/90">
              Continue as a Resident <ArrowRight size={15} />
            </Button>
          </Link>
        </Card>

        <Card className="flex flex-col items-start p-6">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-teal-tint text-teal-deep">
            <Building2 size={20} />
          </span>
          <h2 className="mt-4 font-heading text-[17px] font-semibold text-foreground">Faculty & Institutions</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            See every resident's competency progression, review submissions, and build your own
            training cases — a residency assessment platform, not just an AI tool.
          </p>
          <Link href="/login?role=faculty" className="mt-5 w-full">
            <Button variant="outline" className="w-full gap-1.5 border-teal-deep text-teal-deep hover:bg-teal-tint">
              Continue as Faculty <ArrowRight size={15} />
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
