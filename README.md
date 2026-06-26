# OncologyOrchestrator

Multi-agent AI pipeline that turns a tumor genomic **VCF** into a ranked,
citation-backed cancer **treatment plan** in under ~45 s. Built for Blair Hacks 8
(Healthcare track).

6 specialized agents, each with a distinct mechanism — the orchestrator is the
only one that *reasons*; the rest fetch or compute.

| Agent | Mechanism | Source |
|-------|-----------|--------|
| Genomic | MCP (HTTP) | OncoKB + ClinVar |
| Literature | RAG | ChromaDB + BioBERT |
| Outcome | Local PyTorch | `SurvivalScorer` |
| Trial | MCP (HTTP) | ClinicalTrials.gov |
| Toxicity | MCP (HTTP) | OpenFDA |
| Orchestrator | LLM reasoning | Claude Sonnet |

## Quick start

```bash
pip install -r requirements.txt           # ML deps may already be present
# (optional) put real keys in .env — runs without them via graceful fallbacks

# launch everything (MCP servers :8001-8004, API :8000, UI :3000)
pwsh ./start.ps1          # Windows
./start.sh                # bash
```

Then open **http://localhost:3000**, drop in `demo_patient.vcf` (or click the
demo quick-load), and watch the 6 agents light up in real time.

### Run pieces individually
```bash
python mcp_servers/oncokb_server.py     # :8001
python mcp_servers/clinvar_server.py    # :8002
python mcp_servers/trials_server.py     # :8003
python mcp_servers/fda_server.py        # :8004
python -m uvicorn api.main:app --port 8000
cd frontend && npm run dev              # :3000
```

## API
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/analyze` | multipart `.vcf` upload → `{job_id}` |
| GET | `/stream/{job_id}` | Server-Sent Events of agent activity |
| GET | `/result/{job_id}` | final treatment plan JSON |
| GET | `/agents` | all 6 agent cards (A2A demo view) |

SSE event order: `PIPELINE_START → GENOMIC → LITERATURE → OUTCOME → TRIAL →
TOXICITY → ORCHESTRATOR → PIPELINE_COMPLETE`. Pipeline runs Genomic first, then
Literature+Outcome in parallel, then Trial+Toxicity in parallel, then the
orchestrator.

## Design notes
- **All LLM reasoning runs on Groq `openai/gpt-oss-120b`** — sub-agents and the
  orchestrator. No Anthropic dependency.
- **OncoKB uses the public API** (`https://public.api.oncokb.org/api/v1`). The
  public tier returns oncogenicity/mutation-effect with no token but gates
  treatments + evidence levels behind a licensed key, so the OncoKB server runs a
  hybrid: live oncogenicity, with drug + evidence level enriched from the curated
  KB when absent. Add a real `ONCOKB_API_KEY` to unlock live treatment data.
- **Runs with zero paid keys.** ClinVar and OpenFDA are keyless public APIs; the
  OncoKB public tier is keyless for oncogenicity. The LLMs use `GROQ_API_KEY` when
  present, else fall back to deterministic assembly. `offline_data.py` is the
  curated KB used for OncoKB enrichment and as the offline fallback everywhere.
- **Graceful degradation everywhere** (Section 15): if an MCP server is down the
  agent uses the same offline data in-process, so the demo never crashes.
- **Pre-built assets are never overwritten:** `survival_model.py` (PyTorch
  `SurvivalScorer`) and `chromadb_store/` (collection `pubmed_cancer`, 1466
  PubMed abstracts).
- Python **3.14** — dependency pins are relaxed to `>=` for wheel availability;
  the heavy ML stack (torch / chromadb / sentence-transformers / transformers)
  installs and runs fine.
- ClinicalTrials.gov v2 can return **403** from datacenter IPs (CDN bot filter);
  the trial agent then falls back to the offline trial set. Works from a normal
  residential network.

## Layout
```
agents/        6 agents (genomic, literature, outcome, trial, toxicity, orchestrator)
mcp_servers/   4 FastAPI MCP wrappers + shared _base.py
rag/           BioBERT embedder + ChromaDB retriever
schemas/       Pydantic models + 5 agent-card JSONs
api/           FastAPI app (SSE) + VCF parser
frontend/      Next.js Bloomberg-terminal UI
config.py      central .env loader     offline_data.py  fallback knowledge base
```
