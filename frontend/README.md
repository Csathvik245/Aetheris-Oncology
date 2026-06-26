# OncologyOrchestrator — Frontend Terminal

A Bloomberg-terminal-style dashboard for the OncologyOrchestrator multi-agent
genomics pipeline. Pure black, IBM Plex Mono, electric-cyan accents, sharp 90°
borders, zero gradients/blur/rounding.

Built with **Next.js 16 (App Router) + TypeScript + Tailwind CSS v4**.

## Run

```bash
cd frontend
npm install        # already installed by scaffolding
npm run dev        # http://localhost:3000
```

Production build:

```bash
npm run build
npm run start
```

## Backend connection

The UI talks to the FastAPI backend (default `http://localhost:8000`, CORS
enabled). Override the base URL with an env var:

```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Endpoints consumed:

- `POST /analyze` — multipart upload, field name `file` (.vcf) -> `{ job_id }`
- `GET  /stream/{job_id}` — Server-Sent Events (pipeline progress)
- `GET  /result/{job_id}` — final treatment plan JSON
- `GET  /agents` — A2A agent registry cards

If the backend is offline the header shows **BACKEND OFFLINE** and the page
degrades gracefully instead of crashing.

## Demo

Click **QUICK-LOAD DEMO_PATIENT.VCF** in the VCF INTAKE panel. The demo VCF is
shipped at `public/demo_patient.vcf` (BRAF V600E / TP53 R273C / KRAS G12D,
melanoma) and is POSTed to `/analyze` as a real `File`. You can also drag-drop or
click to pick any `.vcf` from disk.

## Layout

Single page (`app/page.tsx`), componentized under `app/components/`:

1. VCF intake dropzone + demo quick-load
2. Agent log — scrolling terminal of every SSE event (cyan START / green
   COMPLETE / red ERROR)
3. Agent mesh status — 6 badges IDLE -> RUNNING (pulsing) -> DONE -> ERROR
4. Somatic variants table (GENE / VARIANT / ONCOGENIC / EVIDENCE / DRUG)
5. Literature panel — PMID, title, similarity bar
6. Survival-benefit ranked drug bars
7. Clinical trials (NCT / phase / status)
8. Toxicity profile — per-drug risk badge + adverse events
9. Treatment plan — 3 ranked cards (rank, drug, survival score, evidence,
   citations, matching trial, toxicity)
10. A2A agent registry — the 6 `/agents` cards for the judge demo

SSE partial `data` payloads are rendered when present; panels also backfill from
`/result` when the stream omits them.
