import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/app/lib/supabase/server";

export const runtime = "nodejs";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const RESPONSE_SCHEMA_HINT = `Return ONLY a single JSON object with exactly this shape (no markdown, no commentary):
{
  "noteType": "weakness" | "strength" | "mistake" | "suggestion",
  "body": string   // one specific, concrete sentence about this resident's performance on this case
}`;

// Called right after a case completes (see mission-control). Summarizes what
// this specific run revealed about the resident and appends one durable
// mentor_notes row — synchronous, not a background job, so it's always
// consistent with the history_entries row written in the same flow.
export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 });

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("institution_id").eq("id", user.id).single();

  let body: {
    caseId: string;
    biomarkerAgreement: number;
    treatmentAgreement: number;
    toxicityAgreement: number;
    residentDrugs: string[];
    aiDrugs: string[];
    residentBiomarkers: string[];
    aiGenes: string[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const userPrompt = `A resident just completed an oncology training case. Here's what happened, in real terms:
- Biomarker agreement with the AI: ${body.biomarkerAgreement}%
- Treatment agreement with the AI: ${body.treatmentAgreement}%
- Toxicity agreement with the AI: ${body.toxicityAgreement}%
- Resident's biomarker priorities: ${JSON.stringify(body.residentBiomarkers)}
- AI's actionable genes: ${JSON.stringify(body.aiGenes)}
- Resident's drug picks: ${JSON.stringify(body.residentDrugs)}
- AI's top treatments: ${JSON.stringify(body.aiDrugs)}

Identify the single most useful takeaway for their AI Mentor to remember about this resident going forward. If they did well, note the strength. If something was off, be specific about what and why it matters clinically — not just "low score."

${RESPONSE_SCHEMA_HINT}`;

  let groqRes: Response;
  try {
    groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: "You write concise, clinically specific coaching notes. Output only strict JSON." },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        response_format: { type: "json_object" },
      }),
    });
  } catch {
    return NextResponse.json({ error: "Could not reach the Groq API." }, { status: 502 });
  }

  if (!groqRes.ok) {
    return NextResponse.json({ error: "Groq API error" }, { status: 502 });
  }

  const completion = await groqRes.json();
  const raw = completion?.choices?.[0]?.message?.content;
  if (typeof raw !== "string") return NextResponse.json({ error: "No content" }, { status: 502 });

  let parsed: { noteType: string; body: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid model output" }, { status: 502 });
  }

  await supabase.from("mentor_notes").insert({
    user_id: user.id,
    institution_id: profile?.institution_id ?? null,
    note_type: parsed.noteType,
    body: parsed.body,
    related_case_id: body.caseId,
    source: "auto",
  });

  return NextResponse.json({ ok: true });
}
