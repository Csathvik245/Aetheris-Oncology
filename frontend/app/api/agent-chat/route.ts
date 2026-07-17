import { NextResponse } from "next/server";

export const runtime = "nodejs";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

type AgentKey = "genomic" | "literature" | "outcome" | "trial" | "toxicity" | "orchestrator";

const PERSONAS: Record<AgentKey, { label: string; role: string }> = {
  genomic: {
    label: "Genomic Interpreter Agent",
    role: "You annotate this patient's tumor mutations for oncogenicity, evidence level, and matched drugs (OncoKB/ClinVar-style reasoning).",
  },
  literature: {
    label: "Literature Retrieval Agent",
    role: "You retrieve and summarize supporting PubMed literature via semantic search over a ChromaDB corpus of abstracts.",
  },
  outcome: {
    label: "Outcome / Survival Scoring Agent",
    role: "You produce PyTorch-modeled survival-benefit scores that rank candidate drugs for this patient, and you also carry the supporting PubMed literature (retrieved via semantic search over a ChromaDB corpus) that backs those rankings — you know both the resident's proposed regimen and the AI's ranked recommendation for this case, plus the evidence behind it.",
  },
  trial: {
    label: "Clinical Trial Matching Agent",
    role: "You match this patient's profile to recruiting clinical trials on ClinicalTrials.gov.",
  },
  toxicity: {
    label: "Toxicity Assessment Agent",
    role: "You assess adverse-event risk per candidate drug using OpenFDA-style adverse event data.",
  },
  orchestrator: {
    label: "Orchestrator",
    role: "You synthesize every other agent's findings into one final ranked treatment plan.",
  },
};

const VALID_AGENTS = new Set(Object.keys(PERSONAS));
const MAX_TURNS = 12;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequestBody {
  agentKey: string;
  agentData: unknown;
  caseSummary?: string;
  messages: ChatMessage[];
}

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is not configured on the server. Add it to frontend/.env.local and restart the dev server." },
      { status: 500 }
    );
  }

  let body: ChatRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { agentKey, agentData, caseSummary, messages } = body;
  if (!VALID_AGENTS.has(agentKey)) {
    return NextResponse.json({ error: `Unknown agent "${agentKey}".` }, { status: 400 });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages must be a non-empty array." }, { status: 400 });
  }

  const persona = PERSONAS[agentKey as AgentKey];
  const recentMessages = messages.slice(-MAX_TURNS).filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string");

  const systemPrompt = `You are the ${persona.label}, one of several specialized agents in a multi-agent oncology resident-training simulator. ${persona.role}

STRICT SCOPE RULE: the JSON below is the ONLY data you have access to. You do not know what any other agent found — not the genomic mutations, literature citations, survival scores, clinical trials, or toxicity data — unless it appears explicitly in that JSON. If the resident asks about something outside this data, say plainly that it is outside your scope and they should ask the relevant agent instead. Never guess or invent information that is not present below.

YOUR DATA:
${JSON.stringify(agentData ?? null)}
${caseSummary ? `\nCase context: ${caseSummary}` : ""}

Answer the resident's questions concisely (2-4 sentences unless asked for detail), using only the data above.`;

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
        messages: [{ role: "system", content: systemPrompt }, ...recentMessages],
        temperature: 0.3,
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

  return NextResponse.json({ reply, agent: persona.label });
}
