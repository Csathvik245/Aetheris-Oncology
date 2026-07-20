"""Main API (Section 9). FastAPI + SSE streaming over the 6-agent pipeline.

Endpoints:
  POST /analyze          multipart .vcf -> {job_id}
  GET  /stream/{job_id}  Server-Sent Events of agent activity
  GET  /result/{job_id}  final treatment plan JSON
  GET  /agents           all 6 agent cards (A2A demo view)
"""
import asyncio
import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from api.vcf_parser import parse_vcf  # noqa: E402
from agents.genomic_agent import genomic_agent  # noqa: E402
from agents.literature_agent import literature_agent  # noqa: E402
from agents.outcome_agent import outcome_agent  # noqa: E402
from agents.trial_agent import trial_agent  # noqa: E402
from agents.toxicity_agent import toxicity_agent  # noqa: E402
from agents.orchestrator import orchestrator  # noqa: E402

app = FastAPI(title="OncologyOrchestrator API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)

# in-memory job registry (single-process demo)
JOBS: dict[str, dict] = {}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _make_emitter(job_id: str):
    job = JOBS[job_id]

    async def emit(event: str, agent: str, message: str, data=None):
        status = ("running" if event.endswith("_START")
                  else "error" if event == "ERROR"
                  else "done" if event.endswith("_COMPLETE")
                  else "info")
        payload = {"event": event, "agent": agent, "status": status,
                   "message": message, "timestamp": _now()}
        if data is not None:
            payload["data"] = data
        job["events"].append(payload)
        print(f"[{payload['timestamp']}] {agent.upper()} {event}: {message}")

    return emit


async def _run_pipeline(job_id: str, parsed: dict, resident_context: Optional[dict] = None):
    job = JOBS[job_id]
    emit = _make_emitter(job_id)
    patient_id = parsed.get("patient_id", "UNKNOWN")
    cancer_type = parsed.get("cancer_type", "unknown")
    try:
        await emit("PIPELINE_START", "pipeline",
                   f"Analyzing {patient_id} ({cancer_type}) - {len(parsed['mutations'])} variants")

        # 1) Genomic — sequential; everything depends on it
        mutations = await genomic_agent(parsed["mutations"], cancer_type, emit)
        if not mutations:
            await emit("ERROR", "genomic", "No actionable mutations found")

        # 2) Literature + Outcome — parallel
        literature, outcome = await asyncio.gather(
            literature_agent(mutations, emit),
            outcome_agent(mutations, cancer_type, emit),
        )

        # 3) Trial + Toxicity — parallel
        trials, toxicity = await asyncio.gather(
            trial_agent(mutations, cancer_type, emit),
            toxicity_agent(outcome, emit),
        )

        # 4) Orchestrator — sequential; needs all 5. Only the orchestrator
        # (the one agent that reasons, not gathers) ever sees the resident's
        # worksheet — the sub-agents above stay independent/objective.
        plan = await orchestrator(patient_id, cancer_type, mutations,
                                  literature, outcome, trials, toxicity, emit,
                                  resident_context=resident_context)
        job["result"] = plan.model_dump()
        await emit("PIPELINE_COMPLETE", "pipeline", "Pipeline complete")
        job["status"] = "complete"
    except Exception as e:  # pipeline must never hang the stream
        await emit("ERROR", "pipeline", f"Pipeline failed: {type(e).__name__}: {e}")
        job["status"] = "error"


@app.post("/analyze")
async def analyze(file: UploadFile = File(...), resident_context: Optional[str] = Form(None)):
    raw = (await file.read()).decode("utf-8", errors="replace")
    parsed = parse_vcf(raw)
    if not parsed["mutations"]:
        raise HTTPException(400, "No mutations parsed from VCF")

    resident_ctx = None
    if resident_context:
        try:
            resident_ctx = json.loads(resident_context)
        except json.JSONDecodeError:
            resident_ctx = None

    job_id = uuid.uuid4().hex[:12]
    JOBS[job_id] = {"events": [], "result": None, "status": "running", "parsed": parsed}
    asyncio.create_task(_run_pipeline(job_id, parsed, resident_ctx))
    return {"job_id": job_id, "patient_id": parsed["patient_id"],
            "cancer_type": parsed["cancer_type"], "mutation_count": len(parsed["mutations"])}


@app.get("/stream/{job_id}")
async def stream(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(404, "unknown job")

    async def gen():
        # cursor-based replay over the events buffer: supports late joiners and
        # never double-delivers (Section 9).
        idx = 0
        while True:
            evs = job["events"]
            while idx < len(evs):
                yield f"data: {json.dumps(evs[idx])}\n\n"
                idx += 1
            if job["status"] in ("complete", "error"):
                break
            await asyncio.sleep(0.15)

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache",
                                      "X-Accel-Buffering": "no"})


@app.get("/result/{job_id}")
async def result(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(404, "unknown job")
    if job["result"] is None:
        raise HTTPException(425, "result not ready")
    return job["result"]


@app.get("/agents")
async def agents():
    cards_dir = ROOT / "schemas" / "agent_cards"
    cards = []
    for f in sorted(cards_dir.glob("*.json")):
        cards.append(json.loads(f.read_text()))
    # 6th card — the orchestrator (Section 9 demands all 6)
    cards.append({
        "name": "Treatment Orchestrator Agent",
        "description": "Synthesizes all 5 sub-agent outputs into a ranked, citation-backed treatment plan using gpt-oss-120b reasoning via Groq",
        "version": "1.0.0",
        "endpoint": "http://localhost:8000/analyze",
        "input_schema": {"genomic": "...", "literature": "...", "outcome": "...",
                          "trials": "...", "toxicity": "..."},
        "output_schema": {"top_treatments": "array of TopTreatment schema"},
        "capabilities": ["multi_agent_synthesis", "ranking", "clinical_reasoning"],
        "data_sources": ["gpt-oss-120b via Groq"],
    })
    return cards


@app.get("/")
async def root():
    return {"service": "OncologyOrchestrator", "status": "online",
            "endpoints": ["/analyze", "/stream/{job_id}", "/result/{job_id}", "/agents"]}
