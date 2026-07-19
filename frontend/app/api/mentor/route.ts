import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/app/lib/supabase/server";

export const runtime = "nodejs";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const MAX_TURNS = 12;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GROQ_API_KEY is not configured on the server." }, { status: 500 });
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: { messages: ChatMessage[]; skills?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const [{ data: notes }, { data: history }] = await Promise.all([
    supabase
      .from("mentor_notes")
      .select("note_type, body, related_case_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("history_entries")
      .select("case_id, title, difficulty, agreement, occurred_at")
      .eq("user_id", user.id)
      .order("occurred_at", { ascending: false })
      .limit(10),
  ]);

  const recentMessages = (body.messages ?? [])
    .slice(-MAX_TURNS)
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string");

  const systemPrompt = `You are the AI Mentor for an oncology resident training simulator — a persistent coach, not a one-off case chat. You remember this resident's weaknesses, strengths, and mistakes across every case they've completed.

YOUR MEMORY OF THIS RESIDENT — strengths/weaknesses/mistakes from comparing their actual worksheet answers
against the AI pipeline's actual findings on each case, most recent first:
${JSON.stringify(notes ?? [])}

RECENTLY COMPLETED CASES (most recent first, with % agreement vs. the AI pipeline on that case):
${JSON.stringify(history ?? [])}

CURRENT COMPETENCY SCORES:
${JSON.stringify(body.skills ?? null)}

Be direct, specific, and encouraging. Reference concrete patterns from their memory above when relevant (e.g. "I noticed you consistently underutilize clinical trials" is the kind of observation you should make when the data supports it), and feel free to reference a specific completed case by title when it's relevant to what they're asking. If there's no memory yet, focus on what their current scores suggest, or general good habits if there's no data at all. Keep replies to 2-4 sentences unless asked for more detail.`;

  let groqRes: Response;
  try {
    groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "system", content: systemPrompt }, ...recentMessages],
        temperature: 0.5,
        max_tokens: 400,
      }),
    });
  } catch {
    return NextResponse.json({ error: "Could not reach the Groq API." }, { status: 502 });
  }

  if (!groqRes.ok) {
    const detail = await groqRes.text().catch(() => "");
    return NextResponse.json({ error: `Groq API error (${groqRes.status}): ${detail.slice(0, 500)}` }, { status: 502 });
  }

  const completion = await groqRes.json();
  const reply = completion?.choices?.[0]?.message?.content;
  if (typeof reply !== "string") {
    return NextResponse.json({ error: "Groq returned no content." }, { status: 502 });
  }

  return NextResponse.json({ reply });
}
