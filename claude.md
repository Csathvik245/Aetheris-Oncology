OncologyOrchestrator — Full Product Requirements Document
Blair Hacks 8 | Healthcare Track | 46-Hour Build


0. Pre-Flight Checklist
Before Claude Code touches anything, confirm these are done:

chromadb_store/ folder exists and is committed to repo
survival_model.py is in repo root and runs without errors
.env file exists with all keys (see Section 2)
BioBERT weights cached at ~/.cache/huggingface
OncoKB 14-day trial access confirmed via email


1. Project Overview
OncologyOrchestrator is a multi-agent AI pipeline that takes a patient's tumor genomic VCF file as input and produces a ranked, citation-backed cancer treatment plan in under 2 minutes.

The system uses 6 specialized agents, each with a distinct role and data source. No two agents use the same mechanism. The orchestrator is the only agent that reasons — all others fetch or compute.

Input: .vcf genomic file uploaded by clinician
Output: Ranked treatment plan (top 3 options) with drug names, predicted survival benefit scores, PubMed citations, matching clinical trials, and toxicity flags.


2. Environment Variables
Create .env in project root:

ANTHROPIC_API_KEY=your_key_here

GROQ_API_KEY=your_key_here

ONCOKB_API_KEY=your_key_here

HUGGINGFACE_TOKEN=your_token_here

STITCH_API_KEY=your_stitch_key_here

# No keys needed for these — leave as-is:

CLINICALTRIALS_BASE_URL=https://clinicaltrials.gov/api/v2

OPENFDA_BASE_URL=https://api.fda.gov/drug

PUBMED_BASE_URL=https://eutils.ncbi.nlm.nih.gov/entrez/eutils

CHROMA_DB_PATH=./chromadb_store


3. Repository Structure
Claude Code must create this exact structure:

oncology-orchestrator/

├── .env

├── requirements.txt

├── survival_model.py              # already exists — do not overwrite

├── chromadb_store/                # already exists — do not overwrite

│

├── agents/

│   ├── __init__.py

│   ├── orchestrator.py            # Claude Sonnet — final synthesis

│   ├── genomic_agent.py           # MCP — OncoKB + ClinVar

│   ├── literature_agent.py        # RAG — ChromaDB + BioBERT

│   ├── outcome_agent.py           # PyTorch — survival scoring

│   ├── trial_agent.py             # MCP — ClinicalTrials.gov

│   └── toxicity_agent.py          # MCP — OpenFDA

│

├── mcp_servers/

│   ├── __init__.py

│   ├── oncokb_server.py           # FastAPI MCP wrapper for OncoKB

│   ├── clinvar_server.py          # FastAPI MCP wrapper for ClinVar

│   ├── trials_server.py           # FastAPI MCP wrapper for ClinicalTrials

│   └── fda_server.py              # FastAPI MCP wrapper for OpenFDA

│

├── rag/

│   ├── __init__.py

│   ├── retriever.py               # ChromaDB query logic

│   └── embedder.py                # BioBERT embedding logic

│

├── schemas/

│   ├── mutation.py                # Pydantic model for mutation object

│   ├── treatment.py               # Pydantic model for treatment plan

│   └── agent_cards/

│       ├── genomic_agent.json

│       ├── literature_agent.json

│       ├── outcome_agent.json

│       ├── trial_agent.json

│       └── toxicity_agent.json

│

├── api/

│   ├── __init__.py

│   ├── main.py                    # FastAPI app — SSE streaming endpoint

│   └── vcf_parser.py              # VCF file parser

│

└── frontend/                      # Pulled from Stitch MCP

    └── (Claude Code fetches via Stitch MCP — see Section 9)


4. Dependencies
requirements.txt:

fastapi==0.115.0

uvicorn[standard]==0.30.0

anthropic==0.34.0

groq==0.9.0

chromadb==0.5.0

sentence-transformers==3.0.0

torch>=2.0.0

transformers==4.44.0

pydantic==2.8.0

pydantic-settings==2.4.0

python-dotenv==1.0.0

httpx==0.27.0

aiofiles==24.1.0

python-multipart==0.0.9

biopython==1.84

requests==2.32.0

Install command:

pip install -r requirements.txt


5. JSON Schemas
Every agent communicates via typed JSON. These are the exact schemas.
5.1 VCF Input Schema
{

  "patient_id": "string",

  "cancer_type": "string",

  "mutations": [

    {

      "gene": "string",

      "variant": "string",

      "chromosome": "string",

      "position": "integer"

    }

  ]

}
5.2 Mutation (Genomic Agent Output)
{

  "gene": "string",

  "variant": "string",

  "oncogenic": "boolean",

  "evidence_level": "LEVEL_1 | LEVEL_2 | LEVEL_3 | LEVEL_4",

  "drug": "string | null",

  "cancer_type": "string",

  "confidence": "float"

}
5.3 Literature (RAG Agent Output)
{

  "citations": [

    {

      "pmid": "string",

      "title": "string",

      "similarity_score": "float",

      "abstract_snippet": "string"

    }

  ]

}
5.4 Outcome (PyTorch Agent Output)
{

  "drug_scores": [

    {

      "drug": "string",

      "survival_benefit_score": "float",

      "rank": "integer"

    }

  ]

}
5.5 Trial (Trial Agent Output)
{

  "trials": [

    {

      "nct_id": "string",

      "title": "string",

      "status": "RECRUITING | ACTIVE",

      "phase": "string",

      "eligibility_summary": "string"

    }

  ]

}
5.6 Toxicity (Toxicity Agent Output)
{

  "risk_assessments": [

    {

      "drug": "string",

      "risk_level": "LOW | MODERATE | HIGH",

      "adverse_events": ["string"],

      "interaction_flags": ["string"]

    }

  ]

}
5.7 Final Treatment Plan (Orchestrator Output)
{

  "patient_id": "string",

  "generated_at": "ISO8601 timestamp",

  "top_treatments": [

    {

      "rank": "integer",

      "drug": "string",

      "survival_benefit_score": "float",

      "evidence_level": "string",

      "supporting_citations": ["pmid strings"],

      "matching_trial": {

        "nct_id": "string",

        "title": "string"

      },

      "toxicity_risk": "LOW | MODERATE | HIGH",

      "toxicity_notes": "string"

    }

  ],

  "model_attribution": {

    "orchestrator": "claude-sonnet-4-5",

    "sub_agents": "llama-4-scout via groq",

    "embedding": "dmis-lab/biobert-base-cased-v1.2",

    "survival_model": "pytorch-local"

  }

}


6. Agent Specifications
6.1 Genomic Agent
File: agents/genomic_agent.py
Model: Llama 4 Scout via Groq
Mechanism: MCP — calls OncoKB and ClinVar live APIs
Input: Raw parsed mutations from VCF
Output: Filtered list of actionable mutations with drug annotations

# Pseudocode — Claude Code implements full version

async def genomic_agent(mutations: list[dict]) -> list[Mutation]:

    results = []

    for mutation in mutations:

        # Call OncoKB MCP server

        oncokb_result = await call_mcp_server(

            "oncokb_server",

            tool="annotate_mutation",

            params={"gene": mutation["gene"], "variant": mutation["variant"]}

        )

        # Call ClinVar MCP server for cross-reference

        clinvar_result = await call_mcp_server(

            "clinvar_server", 

            tool="check_pathogenicity",

            params={"gene": mutation["gene"], "variant": mutation["variant"]}

        )

        if oncokb_result["oncogenic"]:

            results.append(build_mutation_schema(oncokb_result, clinvar_result))

    return results

SSE Events to emit:

GENOMIC_START: "Querying OncoKB for {n} mutations..."
GENOMIC_COMPLETE: "Found {n} actionable mutations"


6.2 Literature RAG Agent
File: agents/literature_agent.py
Model: Llama 4 Scout via Groq
Mechanism: RAG — ChromaDB vector search over pre-loaded PubMed abstracts
Input: List of actionable mutations from Genomic Agent
Output: Top 8-10 most relevant PubMed citations with similarity scores

# Pseudocode — Claude Code implements full version

async def literature_agent(mutations: list[Mutation]) -> LiteratureOutput:

    # Build semantic query from mutation profile

    query = " ".join([f"{m.gene} {m.variant} {m.drug}" for m in mutations])

    

    # Embed query with BioBERT

    query_embedding = embedder.encode(query)

    

    # Search ChromaDB

    results = chroma_collection.query(

        query_embeddings=[query_embedding.tolist()],

        n_results=10

    )

    

    return build_literature_schema(results)

SSE Events to emit:

LITERATURE_START: "Searching ChromaDB across 5,000 PubMed abstracts..."
LITERATURE_COMPLETE: "Retrieved {n} papers (top score: {score})"


6.3 Outcome Agent (PyTorch)
File: agents/outcome_agent.py
Model: Local PyTorch (SurvivalScorer from survival_model.py)
Mechanism: Pure local computation — no API calls
Input: List of actionable mutations + candidate drugs
Output: Drug combinations ranked by predicted survival benefit score

# Pseudocode — Claude Code implements full version

async def outcome_agent(mutations: list[Mutation]) -> OutcomeOutput:

    scorer = SurvivalScorer()

    

    mutation_text = " ".join([f"{m.gene} {m.variant} oncogenic" for m in mutations])

    candidate_drugs = [m.drug for m in mutations if m.drug]

    

    scores = []

    for drug in candidate_drugs:

        score = scorer.score(mutation_text, drug)

        scores.append({"drug": drug, "survival_benefit_score": score})

    

    scores.sort(key=lambda x: x["survival_benefit_score"], reverse=True)

    return build_outcome_schema(scores)

SSE Events to emit:

OUTCOME_START: "Running PyTorch survival model..."
OUTCOME_COMPLETE: "Top drug: {drug} (score: {score})"


6.4 Trial Agent
File: agents/trial_agent.py
Model: Llama 4 Scout via Groq
Mechanism: MCP — live ClinicalTrials.gov API
Input: Cancer type + actionable mutation gene names
Output: Open recruiting trials matching patient profile

# Pseudocode — Claude Code implements full version

async def trial_agent(mutations: list[Mutation], cancer_type: str) -> TrialOutput:

    genes = [m.gene for m in mutations]

    

    result = await call_mcp_server(

        "trials_server",

        tool="search_trials",

        params={

            "conditions": cancer_type,

            "terms": " ".join(genes),

            "status": "RECRUITING",

            "max_results": 5

        }

    )

    return build_trial_schema(result)

SSE Events to emit:

TRIAL_START: "Querying ClinicalTrials.gov for open trials..."
TRIAL_COMPLETE: "Found {n} recruiting trials"


6.5 Toxicity Agent
File: agents/toxicity_agent.py
Model: Llama 4 Scout via Groq
Mechanism: MCP — live OpenFDA adverse events API
Input: Top-ranked drugs from Outcome Agent
Output: Risk scores and adverse event flags per drug

# Pseudocode — Claude Code implements full version

async def toxicity_agent(drug_scores: list[dict]) -> ToxicityOutput:

    top_drugs = [d["drug"] for d in drug_scores[:3]]

    results = []

    

    for drug in top_drugs:

        fda_result = await call_mcp_server(

            "fda_server",

            tool="get_adverse_events",

            params={"drug_name": drug, "limit": 100}

        )

        risk = classify_risk(fda_result)

        results.append(build_toxicity_schema(drug, fda_result, risk))

    

    return {"risk_assessments": results}

SSE Events to emit:

TOXICITY_START: "Cross-checking OpenFDA adverse events..."
TOXICITY_COMPLETE: "Toxicity analysis complete"


6.6 Orchestrator (Claude Sonnet)
File: agents/orchestrator.py
Model: claude-sonnet-4-5 via Anthropic API
Mechanism: Pure reasoning — receives all 5 JSON outputs, synthesizes final plan
Input: Outputs from all 5 agents
Output: Final ranked treatment plan JSON

System prompt:

You are an oncology treatment planning orchestrator. You receive structured 

JSON outputs from 5 specialized agents: genomic analysis, literature 

retrieval, survival outcome prediction, clinical trial matching, and 

toxicity assessment.

Your job is to synthesize all 5 inputs into a ranked treatment plan with 

exactly 3 options. Each option must include:

- Drug name

- Survival benefit score from the PyTorch model

- Evidence level from OncoKB

- Supporting PubMed citation PMIDs

- Matching clinical trial NCT ID if available

- Toxicity risk level

Return ONLY valid JSON matching the treatment plan schema. No prose.


7. MCP Server Specifications
Each MCP server is a FastAPI app running on a dedicated local port. They wrap external APIs and expose them as tools Claude can call.
7.1 OncoKB MCP Server
File: mcp_servers/oncokb_server.py
Port: 8001
Base URL: https://www.oncokb.org/api/v1

Tools to expose:

annotate_mutation(gene: str, variant: str) -> dict

  GET /annotate/mutations/byProteinChange

  Headers: Authorization: Bearer {ONCOKB_API_KEY}

  Returns: oncogenic status, evidence level, drug, description
7.2 ClinVar MCP Server
File: mcp_servers/clinvar_server.py
Port: 8002
Base URL: https://eutils.ncbi.nlm.nih.gov/entrez/eutils

Tools to expose:

check_pathogenicity(gene: str, variant: str) -> dict

  GET /esearch.fcgi?db=clinvar&term={gene}+{variant}

  Returns: pathogenicity classification, review status
7.3 ClinicalTrials MCP Server
File: mcp_servers/trials_server.py
Port: 8003
Base URL: https://clinicaltrials.gov/api/v2

Tools to expose:

search_trials(conditions: str, terms: str, status: str, max_results: int) -> dict

  GET /studies?query.cond={conditions}&query.term={terms}&filter.overallStatus={status}

  Returns: list of trials with NCT ID, title, phase, eligibility
7.4 OpenFDA MCP Server
File: mcp_servers/fda_server.py
Port: 8004
Base URL: https://api.fda.gov/drug

Tools to expose:

get_adverse_events(drug_name: str, limit: int) -> dict

  GET /event.json?search=patient.drug.medicinalproduct:{drug_name}&limit={limit}

  Returns: adverse event reports, reaction terms, seriousness flags


8. A2A Protocol Implementation
Each agent must expose an agent_card.json at its endpoint. The orchestrator reads these cards before dispatching.
Agent Card Schema
{

  "name": "string",

  "description": "string",

  "version": "1.0.0",

  "endpoint": "http://localhost:{port}/run",

  "input_schema": {},

  "output_schema": {},

  "capabilities": ["string"],

  "data_sources": ["string"]

}
Example — Genomic Agent Card
File: schemas/agent_cards/genomic_agent.json

{

  "name": "Genomic Interpreter Agent",

  "description": "Annotates tumor mutations using OncoKB and ClinVar to identify actionable oncogenic drivers",

  "version": "1.0.0",

  "endpoint": "http://localhost:8001/run",

  "input_schema": {

    "mutations": "array of {gene, variant, chromosome, position}"

  },

  "output_schema": {

    "actionable_mutations": "array of Mutation schema"

  },

  "capabilities": ["mutation_annotation", "drug_matching", "evidence_grading"],

  "data_sources": ["OncoKB", "ClinVar"]

}

Create equivalent cards for all 5 sub-agents.


9. Main API — FastAPI + SSE
File: api/main.py

Endpoints:

POST /analyze

  - Accepts multipart form with .vcf file

  - Parses VCF

  - Triggers full agent pipeline

  - Returns job_id

GET /stream/{job_id}

  - Server-Sent Events endpoint

  - Streams agent status events in real time

  - Event format: data: {"agent": str, "status": str, "timestamp": str}

GET /result/{job_id}

  - Returns final treatment plan JSON once complete

GET /agents

  - Returns all 6 agent cards for judge demo view

SSE event stream must emit these events in order:

PIPELINE_START

GENOMIC_START → GENOMIC_COMPLETE

LITERATURE_START → LITERATURE_COMPLETE

OUTCOME_START → OUTCOME_COMPLETE

TRIAL_START → TRIAL_COMPLETE

TOXICITY_START → TOXICITY_COMPLETE

ORCHESTRATOR_START → ORCHESTRATOR_COMPLETE

PIPELINE_COMPLETE

Pipeline execution order:

Genomic Agent (sequential — everything depends on it)
Literature Agent + Outcome Agent (parallel via asyncio.gather)
Trial Agent + Toxicity Agent (parallel via asyncio.gather)
Orchestrator (sequential — needs all 5 outputs)


10. VCF Parser
File: api/vcf_parser.py

Must handle standard VCF format and extract:

Gene name (from INFO field or annotation)
Variant notation (protein change e.g. V600E)
Chromosome and position

Return parsed mutations in the VCF Input Schema format (Section 5.1).

For demo purposes, also create a mock VCF file:

##fileformat=VCFv4.2

#CHROM POS ID REF ALT QUAL FILTER INFO

7 140453136 . A T . PASS GENE=BRAF;AA_CHANGE=V600E

17 7674220 . C T . PASS GENE=TP53;AA_CHANGE=R273C

12 25398284 . C A . PASS GENE=KRAS;AA_CHANGE=G12D

Save as demo_patient.vcf in repo root.


11. Sub-Agent Team Architecture
Claude Code must run as a team of specialized sub-agents. Each sub-agent owns one domain and works independently.
Sub-Agent 1: Backend & API Agent
Owns: api/main.py, api/vcf_parser.py, FastAPI setup, SSE streaming
Responsibilities:

Set up FastAPI app with CORS
Implement SSE streaming endpoint
Implement VCF file upload and parsing
Wire all agents into pipeline execution order
Handle errors and timeouts per agent
Sub-Agent 2: MCP Servers Agent
Owns: mcp_servers/ directory
Responsibilities:

Build all 4 FastAPI MCP server wrappers
Implement real HTTP calls to OncoKB, ClinVar, ClinicalTrials, OpenFDA
Handle API auth headers
Return clean JSON responses
Run each server on correct port
Sub-Agent 3: RAG Agent
Owns: rag/retriever.py, rag/embedder.py
Responsibilities:

Load existing chromadb_store/ (DO NOT recreate)
Implement BioBERT embedding for queries
Implement ChromaDB similarity search
Return top-k results with scores
Sub-Agent 4: ML Agent
Owns: survival_model.py, agents/outcome_agent.py
Responsibilities:

Load existing SurvivalScorer (DO NOT rewrite)
Implement outcome agent wrapper
Score all candidate drugs
Return ranked list
Sub-Agent 5: Orchestration Agent
Owns: agents/orchestrator.py, agents/*.py, schemas/
Responsibilities:

Implement all 5 sub-agents (genomic, literature, trial, toxicity)
Implement Claude Sonnet orchestrator
Build all Pydantic schemas
Build all agent cards JSON files
Implement asyncio parallel execution
Sub-Agent 6: Frontend Integration Agent
Owns: frontend/ directory
Responsibilities:

Connect to Stitch MCP to pull existing UI
Install shadcn/ui v4 from https://github.com/shadcn-ui/ui/tree/main/apps/v4
Install UI UX Pro Max skill from https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
Wire SSE stream from /stream/{job_id} to agent log panel
Wire file upload to /analyze endpoint
Wire /result/{job_id} to treatment plan display
Wire /agents endpoint to agent cards view


12. Stitch MCP Setup
Claude Code must run this exact command to connect Stitch MCP:

claude mcp add stitch \

  --transport http \

  --header "X-Goog-Api-Key: your_stitch_key_here" \

  https://stitch.googleapis.com/mcp

Then use the Stitch MCP to fetch the existing UI screens built for OncologyOrchestrator. The UI follows a Bloomberg Terminal aesthetic: pure black background, IBM Plex Mono font, electric cyan accents, zero gradients, zero glassmorphism, sharp 90 degree corners.

Do NOT redesign the UI. Only wire it to the backend.


13. shadcn/ui v4 + UI UX Pro Max Setup
Frontend sub-agent must run in order:

# 1. shadcn v4

npx shadcn@canary init

# Select: TypeScript, app router, yes to all defaults

# 2. UI UX Pro Max skill

git clone https://github.com/nextlevelbuilder/ui-ux-pro-max-skill

# Follow SKILL.md instructions inside that repo

# 3. Only use shadcn components for:

#    - File upload dropzone

#    - Treatment plan cards

#    - Agent status badges

#    - Data tables for mutation display

# Do NOT use shadcn for layout — layout comes from Stitch


14. Demo Script (for judges)
The system must work end-to-end with demo_patient.vcf:

Upload demo_patient.vcf via UI
Agent log panel lights up in real time showing all 6 agents
Mutations table populates: BRAF V600E, TP53 R273C, KRAS G12D
Literature panel shows top PubMed papers with similarity scores
PyTorch scores appear: Dabrafenib+Trametinib highest
Trial match appears for BRAF V600E melanoma trial
Toxicity flags appear: moderate cardiotoxicity noted
Final treatment plan renders with 3 ranked options

Total time from upload to result: under 30 seconds.


15. Error Handling Rules
Every agent must have try/except with graceful degradation
If OncoKB is down: fall back to ClinVar only, flag in output
If ChromaDB query fails: return empty citations, do not crash
If PyTorch model errors: return equal scores for all drugs
If ClinicalTrials times out: return empty trials, do not crash
If OpenFDA errors: return LOW risk default, flag as unverified
Orchestrator always produces output even if some agents failed
Log all errors to console with agent name and timestamp
SSE stream must emit ERROR event if any agent fails


16. Run Instructions
Start all services:

# Terminal 1 — MCP Servers

python mcp_servers/oncokb_server.py    # port 8001

python mcp_servers/clinvar_server.py   # port 8002

python mcp_servers/trials_server.py    # port 8003

python mcp_servers/fda_server.py       # port 8004

# Terminal 2 — Main API

uvicorn api.main:app --reload --port 8000

# Terminal 3 — Frontend

cd frontend && npm run dev             # port 3000

Or use a single start script start.sh / start.ps1 that launches all.


17. What Claude Code Must NOT Do
Do NOT overwrite chromadb_store/ — it is pre-loaded
Do NOT overwrite survival_model.py — it is pre-built
Do NOT redesign the UI — wire it, do not restyle it
Do NOT use OpenAI — only Anthropic and Groq
Do NOT use a single monolithic agent — must be 6 separate agents
Do NOT skip the SSE streaming — judges must see real-time activity
Do NOT hardcode API keys — always use .env
Do NOT skip agent cards — they are required for A2A demo


