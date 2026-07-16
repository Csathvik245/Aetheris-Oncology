import { NextResponse } from "next/server";

export const runtime = "nodejs";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

interface GenerateRequestBody {
  cancerType: string;
  metastaticSite: string;
  markers: string[];
  scenario: string;
  scenarioTitle: string;
  complexity: number;
  objectives: string[];
  objectiveTitles: string[];
}

const RESPONSE_SCHEMA_HINT = `Return ONLY a single JSON object with exactly this shape (no markdown, no commentary):
{
  "title": string,                          // short case title, e.g. "Metastatic NSCLC with EGFR Resistance"
  "difficulty": "Beginner" | "Intermediate" | "Advanced",
  "estMinutes": number,                      // realistic estimated completion time, 10-45
  "stage": string,                           // e.g. "IV", "IIIB"
  "tags": string[],                          // 2-4 short uppercase tags
  "age": number,
  "sex": "Male" | "Female",
  "ecog": number,                            // 0-4
  "chiefComplaint": string,                  // 2-3 sentences, patient-reported symptoms
  "medicalHistory": string[],                // 2-4 relevant history items
  "imaging": [ { "study": string, "date": string, "finding": string } ],  // 1-2 studies
  "pathology": {
    "diagnosis": string,
    "markers": [ { "name": string, "value": string } ],   // IHC markers if relevant, else []
    "genomicProfile": string[]               // must include the provided mutation markers verbatim
  },
  "candidateDrugs": [ { "name": string, "subtitle": string } ],  // 2-4 clinically plausible regimen options for this exact profile
  "toxicityConcerns": string[],              // 2-4 known adverse-effect categories for the candidate drugs
  "clinicalPearl": string                    // one sentence of real, verifiable clinical guidance relevant to this case
}`;

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is not configured on the server. Add it to frontend/.env.local and restart the dev server." },
      { status: 500 }
    );
  }

  let body: GenerateRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { cancerType, metastaticSite, markers, scenarioTitle, complexity, objectiveTitles } = body;
  if (!cancerType?.trim() || !metastaticSite?.trim() || !markers?.length || !scenarioTitle || !objectiveTitles?.length) {
    return NextResponse.json({ error: "Missing required generation parameters." }, { status: 400 });
  }

  const userPrompt = `Generate one synthetic oncology resident-training case with these exact configured parameters:
- Cancer type: ${cancerType}
- Metastatic site: ${metastaticSite}
- Mutation profile: ${markers.join(", ")}
- Scenario layer: ${scenarioTitle}
- Complexity (0=beginner, 100=expert): ${complexity}
- Learning objectives: ${objectiveTitles.join(", ")}

Use these parameters directly — every field in your output must be consistent with them. Do not invent a different cancer type, mutation, or site. This is training content for medical residents; keep it clinically plausible and do not reference or resemble any real patient. Ground the candidateDrugs, toxicityConcerns, and clinicalPearl in real, current oncology practice for this mutation/cancer combination.

${RESPONSE_SCHEMA_HINT}`;

  let groqRes: Response;
  try {
    groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
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
    return NextResponse.json(
      { error: `Groq API error (${groqRes.status}): ${detail.slice(0, 500)}` },
      { status: 502 }
    );
  }

  const completion = await groqRes.json();
  const raw = completion?.choices?.[0]?.message?.content;
  if (typeof raw !== "string") {
    return NextResponse.json({ error: "Groq returned no content." }, { status: 502 });
  }

  let generated: Record<string, unknown>;
  try {
    generated = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Model output was not valid JSON." }, { status: 502 });
  }

  return NextResponse.json({ case: generated, model: GROQ_MODEL });
}
