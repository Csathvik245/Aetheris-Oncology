"""Central configuration — loads .env once and exposes typed settings."""
import os
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).parent
load_dotenv(ROOT / ".env")


def _has(key: str) -> bool:
    v = os.getenv(key, "")
    return bool(v) and not v.startswith("your_key") and not v.startswith("your_token")


# Keys
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
ONCOKB_API_KEY = os.getenv("ONCOKB_API_KEY", "")
HUGGINGFACE_TOKEN = os.getenv("HUGGINGFACE_TOKEN", "")

HAS_ANTHROPIC = _has("ANTHROPIC_API_KEY")
HAS_GROQ = _has("GROQ_API_KEY")
HAS_ONCOKB = _has("ONCOKB_API_KEY")

# Base URLs
ONCOKB_BASE_URL = os.getenv("ONCOKB_BASE_URL", "https://public.api.oncokb.org/api/v1")
CLINICALTRIALS_BASE_URL = os.getenv("CLINICALTRIALS_BASE_URL", "https://clinicaltrials.gov/api/v2")
OPENFDA_BASE_URL = os.getenv("OPENFDA_BASE_URL", "https://api.fda.gov/drug")
PUBMED_BASE_URL = os.getenv("PUBMED_BASE_URL", "https://eutils.ncbi.nlm.nih.gov/entrez/eutils")
CHROMA_DB_PATH = os.getenv("CHROMA_DB_PATH", str(ROOT / "chromadb_store"))
CHROMA_COLLECTION = "pubmed_cancer"

# Models — every agent (sub-agents + orchestrator) runs on Groq gpt-oss-120b
ORCHESTRATOR_MODEL = os.getenv("ORCHESTRATOR_MODEL", "openai/gpt-oss-120b")
SUBAGENT_MODEL = os.getenv("SUBAGENT_MODEL", "openai/gpt-oss-120b")
EMBEDDING_MODEL = "dmis-lab/biobert-base-cased-v1.2"

# MCP ports
ONCOKB_PORT = int(os.getenv("ONCOKB_PORT", "8001"))
CLINVAR_PORT = int(os.getenv("CLINVAR_PORT", "8002"))
TRIALS_PORT = int(os.getenv("TRIALS_PORT", "8003"))
FDA_PORT = int(os.getenv("FDA_PORT", "8004"))

MCP_URLS = {
    "oncokb_server": f"http://localhost:{ONCOKB_PORT}",
    "clinvar_server": f"http://localhost:{CLINVAR_PORT}",
    "trials_server": f"http://localhost:{TRIALS_PORT}",
    "fda_server": f"http://localhost:{FDA_PORT}",
}
