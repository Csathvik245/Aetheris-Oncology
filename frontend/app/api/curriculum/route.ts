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

const RESPONSE_SCHEMA_HINT = `Return ONLY a single JSON object with exactly this shape (no markdown, no commentary):
{
  "weeks": [
    {
      "weekNumber": number,
      "focusSkill": string,
      "focusBiomarkers": string[],
      "recommendedCaseIds": string[],   // must be chosen from the AVAILABLE CASES list ids given below, 1-2 per week
      "rationale": string               // 1-2 sentences, specific to this resident's actual scores
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

  const userPrompt = `Build a 4-week adaptive learning path for an oncology resident training on this simulator, based on their real competency scores so far:
${skills.length > 0 ? JSON.stringify(skills) : "No completed sessions yet — build a broad foundational path."}

AVAILABLE CASES (only recommend from this list, by id):
${JSON.stringify(availableCases)}

Prioritize the resident's weakest skill(s) earliest, and sequence cases so each week builds on the last. Keep rationale grounded in their actual scores (or, if none yet, in typical early-training priorities). Do not invent case ids not in the list.

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
