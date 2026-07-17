"use client";

import { useState } from "react";
import { MessageSquare, Send, Info, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type AgentKey = "genomic" | "literature" | "outcome" | "trial" | "toxicity";

const AGENT_LABELS: Record<AgentKey, string> = {
  genomic: "Genomic Interpreter Agent",
  literature: "Literature Retrieval Agent",
  outcome: "Outcome / Survival Scoring Agent",
  trial: "Clinical Trial Matching Agent",
  toxicity: "Toxicity Assessment Agent",
};

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AgentChat({
  agentKey,
  scopeNote,
  agentData,
  caseSummary,
  triggerLabel,
}: {
  agentKey: AgentKey;
  /** Plain-language description of exactly what data this agent has — shown to the resident. */
  scopeNote: string;
  agentData: unknown;
  caseSummary?: string;
  triggerLabel?: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agent-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentKey, agentData, caseSummary, messages: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Chat failed.");
        return;
      }
      setMessages((cur) => [...cur, { role: "assistant", content: data.reply }]);
    } catch {
      setError("Could not reach the chat service.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog>
      <DialogTrigger className="flex items-center gap-2 rounded-full bg-navy px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-navy/90">
        <MessageSquare size={14} /> {triggerLabel ?? `Chat with ${AGENT_LABELS[agentKey]}`}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{AGENT_LABELS[agentKey]}</DialogTitle>
          <DialogDescription className="flex items-start gap-1.5">
            <Info size={13} className="mt-0.5 shrink-0" />
            <span>{scopeNote}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-72 min-h-24 flex-col gap-2 overflow-y-auto">
          {messages.length === 0 && (
            <p className="text-[12px] text-muted-foreground">
              Ask this agent about its own findings — it only knows what&rsquo;s described above.
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-lg px-3 py-2 text-[12.5px] leading-relaxed ${
                m.role === "user" ? "self-end bg-navy text-white" : "self-start bg-muted text-foreground"
              }`}
            >
              {m.content}
            </div>
          ))}
          {loading && (
            <div className="self-start rounded-lg bg-muted px-3 py-2 text-[12px] text-muted-foreground">
              Thinking…
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-1.5 rounded-lg border border-coral-ring bg-coral-tint p-2.5">
            <AlertTriangle size={13} className="mt-0.5 shrink-0 text-coral-text" />
            <p className="text-[11.5px] text-coral-text">{error}</p>
          </div>
        )}

        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            placeholder="Ask a question…"
            disabled={loading}
          />
          <Button onClick={send} disabled={loading || !input.trim()} className="shrink-0 bg-navy text-white hover:bg-navy/90">
            <Send size={14} />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
