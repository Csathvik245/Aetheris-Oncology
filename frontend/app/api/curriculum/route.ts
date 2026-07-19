import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/app/lib/supabase/server";
import { CASES } from "@/app/lib/mock";

export const runtime = "nodejs";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

interface CompetencySkill {
  skill: string;
  score: number;
}

const TOPIC_TAGS = [
  "first-line-therapy",
  "resistance-mechanisms",
  "toxicity-management",
  "adjuvant-therapy",
  "biomarker-testing",
  "trial-eligibility",
  "monitoring",
  "salvage-therapy",
];

const RESPONSE_SCHEMA_HINT = `Return ONLY a single JSON object with exactly this shape (no markdown, no commentary):
{
  "weeks": [
    {
      "weekNumber": number,
      "focusSkill": string,              // a short, human-readable theme title (e.g. "Biomarker Interpretation", "TKI Resistance Patterns") — NOT a topic-tag slug like "biomarker-testing"
      "focusBiomarkers": string[],
      "recommendedCaseIds": string[],   // must be chosen from the AVAILABLE CASES list ids given below, 1-2 per week
      "rationale": string,              // 1-2 sentences, specific to this resident's actual scores
      "examFilter": {
        "cancerType": string | null,    // must be chosen from AVAILABLE CANCER TYPES, or null for "any"
        "topics": string[],             // 0-2 values chosen from AVAILABLE TOPICS, matching this week's focus
        "difficulty": "Beginner" | "Intermediate" | "Advanced" | null
      },
      "mentorPrompt": string            // one specific, concrete question this resident should ask their AI Mentor this week, grounded in their actual weakest skill — not generic
    }
  ]
}`;

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

  const { data: profile } = await supabase.from("profiles").select("institution_id").eq("id", user.id).single();

  let skills: CompetencySkill[] = [];
  try {
    const body = await request.json();
    skills = body.skills ?? [];
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const availableCases = CASES.map((c) => ({
    id: c.id,
    title: c.title,
    mutation: c.mutation,
    cancerType: c.cancerType,
    difficulty: c.difficulty,
    tags: c.tags,
  }));

  const { data: examRows } = await supabase.from("exams").select("specialty_tag");
  const availableCancerTypes = Array.from(new Set((examRows ?? []).map((e) => e.specialty_tag).filter(Boolean)));

  const userPrompt = `Build a 4-week adaptive learning path for an oncology resident training on this simulator, based on their real competency scores so far:
${skills.length > 0 ? JSON.stringify(skills) : "No completed sessions yet — build a broad foundational path."}

AVAILABLE CASES (only recommend from this list, by id):
${JSON.stringify(availableCases)}

AVAILABLE CANCER TYPES (for examFilter.cancerType — use null if the week isn't specific to one):
${JSON.stringify(availableCancerTypes)}

AVAILABLE TOPICS (for examFilter.topics):
${JSON.stringify(TOPIC_TAGS)}

Prioritize the resident's weakest skill(s) earliest, and sequence cases so each week builds on the last. Keep rationale grounded in their actual scores (or, if none yet, in typical early-training priorities). Do not invent case ids, cancer types, or topics not in the lists given. Each week's mentorPrompt should be something a resident would genuinely type into a chat with their mentor — specific and actionable, not a restatement of the rationale.

${RESPONSE_SCHEMA_HINT}`;

  let groqRes: Response;
  try {
    groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a medical education curriculum planner for an oncology resident training simulator. You output only strict JSON, no markdown fences, no prose outside the JSON object.",
          },
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
    const detail = await groqRes.text().catch(() => "");
    return NextResponse.json({ error: `Groq API error (${groqRes.status}): ${detail.slice(0, 500)}` }, { status: 502 });
  }

  const completion = await groqRes.json();
  const raw = completion?.choices?.[0]?.message?.content;
  if (typeof raw !== "string") {
    return NextResponse.json({ error: "Groq returned no content." }, { status: 502 });
  }

  let parsed: { weeks: unknown[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Model output was not valid JSON." }, { status: 502 });
  }

  await supabase.from("curriculum_plans").delete().eq("user_id", user.id);
  const { data: inserted, error: insertError } = await supabase
    .from("curriculum_plans")
    .insert({
      user_id: user.id,
      institution_id: profile?.institution_id ?? null,
      weeks: parsed.weeks,
      active: true,
    })
    .select("id, generated_at, weeks")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json(inserted);
}
