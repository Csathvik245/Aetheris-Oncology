import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/app/lib/supabase/server";

export const runtime = "nodejs";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const RESPONSE_SCHEMA_HINT = `Return ONLY a single JSON object with exactly this shape (no markdown, no commentary):
{
  "notes": [
    {
      "noteType": "strength" | "weakness" | "mistake" | "suggestion",
      "body": string   // one specific, concrete sentence grounded in exactly what the resident wrote and exactly what the AI pipeline found
    }
  ]
}
Return 2 to 4 notes: at least one strength (something the resident actually got right, named specifically) and at least one weakness or mistake if one genuinely exists. Do not pad with generic notes if there's nothing more to say.`;

interface CaseSubmissionRow {
  drugs: { name: string; rationale: string; citation: string }[];
  monitoring: string;
  dose_modification: string;
  tags: string[];
  diagnosis_note: string;
  biomarker_order: string[];
  biomarker_checks: Record<string, boolean>;
}

interface PipelineRunRow {
  mutations: { gene: string; variant?: string; oncogenic?: boolean; evidence_level?: string; drug?: string | null }[];
  drug_scores: { drug: string; survival_benefit_score: number; rank: number }[];
  trials: { nct_id: string; title: string; status: string }[];
  risks: { drug: string; risk_level: string; adverse_events: string[] }[];
  plan: { top_treatments?: { drug: string; evidence_level?: string; toxicity_risk?: string }[] } | null;
}

// Called right after a case completes (see mission-control). Reads the
// resident's actual worksheet and the AI pipeline's actual output for this
// case straight from the database — not a lossy client-derived summary —
// so the mentor can reason about both sides together, not just percentages.
export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 });

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("institution_id").eq("id", user.id).single();

  let body: { caseId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!body.caseId) return NextResponse.json({ error: "caseId is required" }, { status: 400 });

  const [{ data: submission }, { data: pipeline }] = await Promise.all([
    supabase
      .from("case_submissions")
      .select("drugs, monitoring, dose_modification, tags, diagnosis_note, biomarker_order, biomarker_checks")
      .eq("case_id", body.caseId)
      .eq("user_id", user.id)
      .maybeSingle<CaseSubmissionRow>(),
    supabase
      .from("pipeline_runs")
      .select("mutations, drug_scores, trials, risks, plan")
      .eq("case_id", body.caseId)
      .eq("user_id", user.id)
      .maybeSingle<PipelineRunRow>(),
  ]);

  if (!submission || !pipeline) {
    return NextResponse.json({ error: "Submission or pipeline data not found for this case." }, { status: 404 });
  }

  const residentBiomarkers = submission.biomarker_order.filter((g) => submission.biomarker_checks[g]);

  const userPrompt = `A resident just completed an oncology training case. Here is exactly what each side produced —
compare them and identify what the resident's reasoning shows.

RESIDENT'S WORKSHEET (their own words and choices):
- Diagnosis/reasoning note: ${submission.diagnosis_note || "(none written)"}
- Biomarkers they flagged as decision-driving (in priority order): ${JSON.stringify(residentBiomarkers)}
- Drug picks with their stated rationale:
${submission.drugs.map((d) => `  - ${d.name}: "${d.rationale}" (citation: ${d.citation || "none"})`).join("\n") || "  (none)"}
- Monitoring plan: ${submission.monitoring || "(none written)"}
- Dose modification plan: ${submission.dose_modification || "(none written)"}
- Tags they applied: ${JSON.stringify(submission.tags)}

AI PIPELINE'S OWN ANALYSIS OF THE SAME CASE:
- Actionable mutations found: ${JSON.stringify(pipeline.mutations.map((m) => ({ gene: m.gene, variant: m.variant, evidence_level: m.evidence_level, drug: m.drug })))}
- Top treatments ranked by survival benefit: ${JSON.stringify(pipeline.drug_scores)}
- Matching clinical trials: ${JSON.stringify(pipeline.trials.map((t) => ({ nct_id: t.nct_id, title: t.title })))}
- Toxicity risk assessment: ${JSON.stringify(pipeline.risks.map((r) => ({ drug: r.drug, risk_level: r.risk_level, adverse_events: r.adverse_events })))}
- Final treatment plan top pick: ${JSON.stringify(pipeline.plan?.top_treatments?.[0] ?? null)}

Compare the resident's actual reasoning (not just whether the final drug name matched) against the AI's actual findings.
Where they agree, name the specific overlap as a strength. Where they diverge, name the specific gap — e.g. a
biomarker the AI flagged that the resident didn't mention, a toxicity risk the resident's monitoring plan doesn't
cover, or a citation-worthy rationale the resident got right that's worth reinforcing.

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
              "You write concise, clinically specific coaching notes by comparing a resident's actual reasoning against an AI pipeline's actual findings. Output only strict JSON.",
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
    return NextResponse.json({ error: "Groq API error" }, { status: 502 });
  }

  const completion = await groqRes.json();
  const raw = completion?.choices?.[0]?.message?.content;
  if (typeof raw !== "string") return NextResponse.json({ error: "No content" }, { status: 502 });

  let parsed: { notes: { noteType: string; body: string }[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid model output" }, { status: 502 });
  }

  const notes = (parsed.notes ?? []).filter((n) => n.noteType && n.body);
  if (notes.length === 0) return NextResponse.json({ ok: true, count: 0 });

  await supabase.from("mentor_notes").insert(
    notes.map((n) => ({
      user_id: user.id,
      institution_id: profile?.institution_id ?? null,
      note_type: n.noteType,
      body: n.body,
      related_case_id: body.caseId,
      source: "auto",
    })),
  );

  return NextResponse.json({ ok: true, count: notes.length });
}
