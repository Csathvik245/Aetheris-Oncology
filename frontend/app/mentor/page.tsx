"use client";

import { useEffect, useRef, useState } from "react";
import { BrainCircuit, Send } from "lucide-react";
import { Shell } from "../components/shell/Shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { computeCompetencyProfile } from "../lib/session";
import { createClient } from "../lib/supabase/client";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface MentorNote {
  note_type: string;
  body: string;
  created_at: string;
}

export default function MentorPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [notes, setNotes] = useState<MentorNote[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("mentor_notes")
        .select("note_type, body, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      setNotes(data ?? []);
    });
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  async function ask() {
    const question = input.trim();
    if (!question || pending) return;
    setInput("");
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: question }];
    setMessages(nextMessages);
    setPending(true);

    const skills = await computeCompetencyProfile();
    const res = await fetch("/api/mentor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: nextMessages, skills }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setMessages((m) => [...m, { role: "assistant", content: data.error ?? "Something went wrong." }]);
      return;
    }
    setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
  }

  return (
    <Shell breadcrumb="AI Mentor">
      <div className="mx-auto flex h-full max-w-3xl gap-5 px-6 py-6">
        <div className="flex flex-1 flex-col">
          <div className="mb-4 flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-navy text-white">
              <BrainCircuit size={17} />
            </span>
            <div>
              <h1 className="font-heading text-[19px] font-bold text-foreground">AI Mentor</h1>
              <p className="text-[12px] text-muted-foreground">Remembers your weaknesses, strengths, and mistakes across every case.</p>
            </div>
          </div>

          <Card className="flex flex-1 flex-col overflow-hidden p-0">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
              {messages.length === 0 && (
                <div className="grid h-full place-items-center text-center">
                  <p className="max-w-sm text-[12.5px] text-muted-foreground">
                    Ask your mentor anything — e.g. &ldquo;What should I focus on this week?&rdquo; or &ldquo;Why do I keep missing trial matches?&rdquo;
                  </p>
                </div>
              )}
              <div className="flex flex-col gap-3">
                {messages.map((m, i) =>
                  m.role === "user" ? (
                    <div key={i} className="ml-auto max-w-[75%] rounded-lg bg-navy px-3.5 py-2.5 text-[13px] text-white">
                      {m.content}
                    </div>
                  ) : (
                    <div key={i} className="max-w-[85%] rounded-lg border border-border bg-card p-3 text-[13px] text-foreground">
                      {m.content}
                    </div>
                  ),
                )}
                {pending && (
                  <div className="max-w-[85%] rounded-lg border border-border bg-card p-3 text-[12.5px] text-muted-foreground">
                    Thinking…
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 border-t border-border p-3">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && ask()}
                placeholder="Ask your mentor…"
                disabled={pending}
              />
              <Button onClick={ask} disabled={pending || !input.trim()} className="shrink-0 bg-navy text-white hover:bg-navy/90">
                <Send size={15} />
              </Button>
            </div>
          </Card>
        </div>

        <div className="w-64 shrink-0">
          <h3 className="font-heading text-[13px] font-semibold text-foreground">Memory</h3>
          <div className="mt-2 flex flex-col gap-2">
            {notes.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">No notes yet — complete a case to build your mentor's memory.</p>
            ) : (
              notes.map((n, i) => (
                <div key={i} className="rounded-lg border border-border bg-card p-2.5">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {n.note_type}
                  </span>
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-foreground">{n.body}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
