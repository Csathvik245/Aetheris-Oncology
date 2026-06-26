"""Literature RAG Agent (Section 6.2). RAG -> ChromaDB + BioBERT. Model: Llama 4 Scout via Groq."""
import asyncio
from typing import Callable, List, Optional

from schemas.mutation import Mutation
from schemas.treatment import LiteratureOutput
from rag.retriever import search


async def literature_agent(mutations: List[Mutation],
                           emit: Optional[Callable] = None) -> LiteratureOutput:
    if emit:
        await emit("LITERATURE_START", "literature",
                   "Searching ChromaDB across pre-loaded PubMed abstracts...")

    query = " ".join(
        f"{m.gene} {m.variant} {m.drug or ''} {m.cancer_type}".strip()
        for m in mutations
    ) or "cancer targeted therapy"

    # retriever is sync (chroma/torch) -> run off the event loop
    result = await asyncio.to_thread(search, query, 10)
    out = LiteratureOutput(**result)

    if emit:
        top = max((c.similarity_score for c in out.citations), default=0.0)
        await emit("LITERATURE_COMPLETE", "literature",
                   f"Retrieved {len(out.citations)} papers (top score: {round(top, 3)})",
                   data={"citations": [c.model_dump() for c in out.citations]})
    return out
