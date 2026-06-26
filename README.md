# Aetheris Oncology

**Multi-agent precision-oncology orchestrator: a tumor genome in, a ranked set of evidence-backed treatment options out.**

Aetheris connects scattered cancer data — variants, evidence, literature, and trials — into a single navigable pattern. Like stars resolving into a constellation, each point means little alone; the value is in the connections between them.

> ⚠️ **Demonstration project — not for clinical use.** A hackathon prototype illustrating an architecture for precision-oncology decision support, not a validated medical device. See Scope & Limitations.

🔗 **Live demo:** _add URL_
🎥 **Demo video:** _add link_

Built for **BlairHacks** — theme: *constellation*.

## The problem

A sequenced tumor produces a list of mutations — sometimes hundreds. Buried in it is one question: what treatment will actually work for this patient? Today that means a molecular tumor board manually cross-referencing knowledge bases, trials, and research, one patient at a time — slow, inconsistent, and concentrated at major cancer centers. The data already exists but is fragmented; the bottleneck is synthesis.

## What it does

Upload a patient's VCF and a pipeline of specialized agents runs end-to-end:

1. **VCF Parser** — extracts the mutations.
2. **Genomic Analyzer** — annotates oncogenicity, identifies actionable drivers.
3. **Literature RAG** — embeds the variant profile with BioBERT, semantic-searches a research vector index.
4. **Outcome Predictor** — scores candidate therapies by evidence, variant match, and toxicity.
5. **Trial Matcher** — surfaces relevant recruiting trials.
6. **Toxicity Agent** — checks adverse-event signals.

The result is a ranked, traceable set of options, each tied to the variant, evidence level, literature (PMIDs), and trials (NCT IDs) that justify it. Everything is computed live from the genome — nothing is hardcoded to one demo file. The orchestrator graph renders this as a constellation that assembles in real time: as each agent resolves, its connection lights up and the full pattern forms.

## Why it's cancer-type aware

The same mutation can mean different things in different cancers. BRAF V600E in melanoma is treated with a BRAF/MEK inhibitor combination — but in colorectal cancer that underperforms, and the standard of care pairs a BRAF inhibitor with an anti-EGFR antibody. Aetheris resolves therapies through a (variant × cancer type) mapping, so recommendations reflect clinical context, not a naive gene-to-drug lookup.

## Tech stack

- **Frontend:** Next.js, TypeScript, Tailwind
- **Backend:** FastAPI, Server-Sent Events
- **Agents/LLM:** multi-agent orchestration over MCP, Groq `gpt-oss-120b`
- **Retrieval:** BioBERT embeddings, ChromaDB vector store
- **Knowledge sources:** OncoKB, ClinVar, ClinicalTrials.gov, openFDA (via MCP) + curated local KB
- **Scoring:** PyTorch (local), evidence-weighted heuristic

## Running locally

**Prerequisites:** Python 3.10+ (developed on 3.14) and Node.js 20+.

```bash
# 1. Python deps
pip install -r requirements.txt

# 2. Frontend deps
cd frontend && npm install && cd ..

# 3. (optional) API keys — runs with zero paid keys via graceful fallbacks.
#    In .env, add GROQ_API_KEY for live LLM synthesis and/or ONCOKB_API_KEY
#    for licensed OncoKB treatment data. Without them the pipeline still runs.
```

The vector store (`chromadb_store/`, collection `pubmed_cancer`) and the PyTorch `SurvivalScorer` (`survival_model.py`) ship pre-built in the repo — no build step needed. To rebuild the index from PubMed: `python setup_chroma.py`.

**Start everything** (MCP servers `:8001–8004`, API `:8000`, UI `:3000`):

```bash
pwsh ./start.ps1     # Windows
./start.sh           # macOS / Linux
```

Or run each piece individually:

```bash
python mcp_servers/oncokb_server.py     # :8001  OncoKB
python mcp_servers/clinvar_server.py    # :8002  ClinVar
python mcp_servers/trials_server.py     # :8003  ClinicalTrials.gov
python mcp_servers/fda_server.py        # :8004  openFDA
python -m uvicorn api.main:app --port 8000   # :8000  API + SSE
cd frontend && npm run dev              # :3000  UI
```

Then open **http://localhost:3000**, click **New Analysis**, and upload a sample VCF from the repo root — `glioblastoma.vcf`, `colorectal_msi_patient.vcf`, or `demo_patient.vcf`. The constellation forms as each agent resolves.

## Scope & limitations

- **Not clinically validated. Not for patient care.** It demonstrates an architecture, not a medical device.
- **The drug knowledge base is curated, not exhaustive.** Variants outside the covered set fall back to standard-of-care or generic handling.
- **"Match Confidence" is a heuristic, not a survival prediction** — it combines evidence level, variant match, and toxicity into an explainable ranking signal.
- **The literature index is a bounded corpus** of pre-embedded abstracts, not a live PubMed query.
- **Sample VCFs are synthetic** demonstration files.

Genuinely dynamic: VCF parsing, variant detection, oncogenicity annotation, literature retrieval, trial matching, and cancer-type-aware therapy resolution all run live per file — different inputs produce different drivers, drugs, papers, and trials.
