"use client";

import { useState } from "react";
import { Ticket, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function PilotRequestPage() {
  const [institutionName, setInstitutionName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function submit() {
    setError(null);
    if (!institutionName.trim() || !contactName.trim() || !contactEmail.trim()) {
      setError("Institution name, your name, and email are required.");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/marketing/pilot-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        institutionName: institutionName.trim(),
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim(),
        phone: phone.trim() || undefined,
        message: message.trim() || undefined,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setSubmitted(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-teal-deep text-white">
            <Ticket size={22} />
          </div>
          <h1 className="mt-4 font-heading text-[22px] font-bold tracking-tight text-foreground">Request a Pilot</h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
            Tell us about your program — we'll get on a call, and if it's a fit, give you a code to activate a free
            45-day pilot for your residents.
          </p>
        </div>

        <Card className="p-6">
          {submitted ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <CheckCircle2 size={32} className="text-teal-deep" />
              <p className="text-[14px] font-medium text-foreground">Request received</p>
              <p className="text-[12.5px] text-muted-foreground">We'll be in touch to schedule a call.</p>
              <a href="/" className="mt-3 text-[12.5px] font-semibold text-navy hover:underline">← Back to home</a>
            </div>
          ) : (
            <>
              <label className="label mb-1.5 block">Institution Name</label>
              <Input value={institutionName} onChange={(e) => setInstitutionName(e.target.value)} placeholder="University Hospital" />

              <label className="label mb-1.5 mt-4 block">Your Name</label>
              <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Dr. Jane Smith" />

              <label className="label mb-1.5 mt-4 block">Email</label>
              <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="you@hospital.org" />

              <label className="label mb-1.5 mt-4 block">Phone (optional)</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" />

              <label className="label mb-1.5 mt-4 block">Anything we should know? (optional)</label>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Program size, timeline, questions…" rows={3} />

              {error && <p className="mt-3 text-[12.5px] text-coral-text">{error}</p>}

              <Button onClick={submit} disabled={submitting} className="mt-6 w-full bg-teal-deep py-5 text-white hover:bg-teal-deep/90">
                {submitting ? "Sending…" : "Request a Pilot"}
              </Button>
            </>
          )}
        </Card>

        {!submitted && (
          <p className="mt-4 text-center text-[12px] text-muted-foreground">
            Already have a code? <a href="/redeem" className="font-semibold text-navy hover:underline">Redeem it here</a>
          </p>
        )}
      </div>
    </div>
  );
}
