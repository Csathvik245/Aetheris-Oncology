import { NextResponse } from "next/server";
import { createClient as createServerClient, createServiceRoleClient } from "@/app/lib/supabase/server";
import { checkAndIncrementCaseGenUsage } from "@/app/lib/limits";

export const runtime = "nodejs";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const VARIATION_LABELS: Record<string, string> = {
  older_patient: "the patient is now significantly older (75+) with reduced performance status and more comorbidities",
  new_mutation: "a new resistance-conferring co-mutation has emerged on repeat biopsy/NGS",
  pregnancy: "the patient is now pregnant, which changes which therapies are viable",
  renal_failure: "the patient has developed significant renal impairment affecting drug clearance/dosing",
  brain_mets: "the patient has developed new brain metastases",
  trial_closed: "the clinical trial the patient was being considered for has just closed to enrollment",
};

interface Body {
  baseCaseId: string;
  variationType: keyof typeof VARIATION_LABELS;
  packet: {
    age: number;
    sex: string;
    ecog: number;
    chiefComplaint: string;
    medicalHistory: string[];
    pathology: { diagnosis: string; markers: { name: string; value: string }[]; genomicProfile: string[] };
  };
}

const RESPONSE_SCHEMA_HINT = `Return ONLY a single JSON object with exactly this shape (no markdown, no commentary):
{
  "title": string,
  "difficulty": "Beginner" | "Intermediate" | "Advanced",
  "estMinutes": number,
  "stage": string,
  "tags": string[],
  "age": number,
  "sex": "Male" | "Female",
  "ecog": number,
  "chiefComplaint": string,
  "medicalHistory": string[],
  "imaging": [ { "study": string, "date": string, "finding": string } ],
  "pathology": {
    "diagnosis": string,
    "markers": [ { "name": string, "value": string } ],
    "genomicProfile": string[]
  },
  "candidateDrugs": [ { "name": string, "subtitle": string } ],
  "toxicityConcerns": string[],
  "clinicalPearl": string
}`;

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GROQ_API_KEY is not configured on the server." }, { status: 500 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { baseCaseId, variationType, packet } = body;
  const variationLabel = VARIATION_LABELS[variationType];
  if (!baseCaseId || !variationLabel || !packet) {
    return NextResponse.json({ error: "Missing baseCaseId, variationType, or packet." }, { status: 400 });
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("institution_id").eq("id", user.id).single();
  if (profile?.institution_id) {
    const limitError = await checkAndIncrementCaseGenUsage(profile.institution_id);
    if (limitError) return NextResponse.json({ error: limitError }, { status: 429 });
  }

  const userPrompt = `Branch this existing oncology training case into a new variation. Here is the base case:
${JSON.stringify(packet)}

Variation to apply: ${variationLabel}

Keep everything else about the case consistent with the base (same underlying cancer type and diagnosis) except what the variation directly implies. Update candidateDrugs, toxicityConcerns, and clinicalPearl to reflect real, current oncology practice given the variation. This is training content for medical residents; keep it clinically plausible and do not reference or resemble any real patient.

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
              "You are a clinical oncology case-writing assistant for a resident training simulator. You output only strict JSON, no markdown fences, no prose outside the JSON object.",
          },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.6,
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

  let generated: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- untyped LLM JSON, same pattern as generate-case
  try {
    generated = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Model output was not valid JSON." }, { status: 502 });
  }

  const id = `var-${crypto.randomUUID()}`;
  const admin = createServiceRoleClient();
  const { error: insertError } = await admin.from("cases").insert({
    id,
    owner_id: user.id,
    institution_id: profile?.institution_id ?? null,
    source: "variation",
    visibility: "private",
    base_case_id: baseCaseId,
    variation_type: variationType,
    title: generated.title,
    difficulty: generated.difficulty,
    est_minutes: generated.estMinutes ?? 20,
    stage: generated.stage,
    tags: generated.tags ?? [],
    age: generated.age,
    sex: generated.sex,
    ecog: generated.ecog,
    chief_complaint: generated.chiefComplaint,
    medical_history: generated.medicalHistory ?? [],
    imaging: generated.imaging ?? [],
    pathology: generated.pathology,
    candidate_drugs: generated.candidateDrugs ?? [],
    toxicity_concerns: generated.toxicityConcerns ?? [],
    clinical_pearl: generated.clinicalPearl,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ caseId: id });
}
