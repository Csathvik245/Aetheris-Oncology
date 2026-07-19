"use client";

import Link from "next/link";
import { GraduationCap, ArrowRight, Ticket, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function MarketingHome() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-6 py-16">
      <nav className="mb-10 flex w-full max-w-4xl items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-navy text-white">
            <GraduationCap size={16} />
          </span>
          <span className="font-heading text-[15px] font-bold text-foreground">Aetheris Oncology</span>
        </div>
        <div className="flex items-center gap-5 text-[13px] font-medium text-muted-foreground">
          <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
          <Link href="/pilot" className="hover:text-foreground">Request a Pilot</Link>
          <Link href="/redeem" className="hover:text-foreground">Have a Code?</Link>
          <Link href="/select-role" className="hover:text-foreground">Resident / Faculty Sign In</Link>
        </div>
      </nav>

      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-navy text-white">
        <GraduationCap size={26} />
      </div>
      <h1 className="mt-5 max-w-2xl text-center font-heading text-[34px] font-bold tracking-tight text-foreground">
        Turn every resident into a tumor board-ready oncologist
      </h1>
      <p className="mt-3 max-w-xl text-center text-[15px] leading-relaxed text-muted-foreground">
        An AI-powered oncology training simulator for residency programs — synthetic patient cases, board exams,
        adaptive curricula, and faculty analytics, all synced to your program's residents from day one.
      </p>

      <div className="mt-10 flex items-center gap-3">
        <Link href="/pricing">
          <Button className="gap-1.5 bg-navy px-6 py-5 text-white hover:bg-navy/90">
            See Plans & Pricing <ArrowRight size={15} />
          </Button>
        </Link>
        <Link href="/pilot">
          <Button variant="outline" className="gap-1.5 px-6 py-5">
            Request a Pilot
          </Button>
        </Link>
      </div>

      <div className="mt-14 grid w-full max-w-3xl grid-cols-2 gap-5">
        <Card className="flex flex-col items-start p-6">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-navy-tint text-navy">
            <ShieldCheck size={20} />
          </span>
          <h2 className="mt-4 font-heading text-[16px] font-semibold text-foreground">Buy a plan today</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            Pick a tier on the pricing page and get your program set up immediately — seats are limited per tier.
          </p>
          <Link href="/pricing" className="mt-4 text-[13px] font-semibold text-navy hover:underline">
            View plans →
          </Link>
        </Card>

        <Card className="flex flex-col items-start p-6">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-teal-tint text-teal-deep">
            <Ticket size={20} />
          </span>
          <h2 className="mt-4 font-heading text-[16px] font-semibold text-foreground">Talk to us first</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            Request a pilot, get on a call with our team, and redeem the code we give you to activate your program.
          </p>
          <Link href="/pilot" className="mt-4 text-[13px] font-semibold text-teal-deep hover:underline">
            Request a pilot →
          </Link>
        </Card>
      </div>
    </div>
  );
}
