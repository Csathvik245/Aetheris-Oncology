"""ChromaDB similarity search over the pre-loaded `pubmed_cancer` collection.

DO NOT recreate the store — only query the existing one (Section 11, Sub-Agent 3).
Returns results shaped for the Literature schema (Section 5.3).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
import config  # noqa: E402
from rag.embedder import embed  # noqa: E402

_collection = None


def _get_collection():
    global _collection
    if _collection is None:
        import chromadb
        client = chromadb.PersistentClient(path=config.CHROMA_DB_PATH)
        _collection = client.get_collection(config.CHROMA_COLLECTION)
    return _collection


def _pmid_from(meta: dict, doc_id: str, idx: int) -> str:
    if meta and meta.get("pmid"):
        return str(meta["pmid"])
    # synthesise a stable id from the chroma doc id for demo display
    digits = "".join(ch for ch in doc_id if ch.isdigit())
    return digits or str(10000000 + idx)


def _title_from(doc: str, meta: dict) -> str:
    if meta and meta.get("title"):
        return meta["title"]
    first = doc.strip().split("\n")[0]
    return (first[:120] + "…") if len(first) > 120 else first


def search(query: str, n_results: int = 10) -> dict:
    """Return {'citations': [...]} per Section 5.3. Never raises (Section 15)."""
    try:
        collection = _get_collection()
        embedding = embed(query)
        res = collection.query(query_embeddings=[embedding], n_results=n_results)
    except Exception as e:  # pragma: no cover - defensive
        print(f"[retriever] query failed: {e}")
        return {"citations": []}

    docs = (res.get("documents") or [[]])[0]
    metas = (res.get("metadatas") or [[]])[0] or [{}] * len(docs)
    ids = (res.get("ids") or [[]])[0] or [f"doc_{i}" for i in range(len(docs))]
    dists = (res.get("distances") or [[]])[0] or [0.0] * len(docs)

    # BioBERT embeddings give large L2 distances; normalise relative to this
    # result set so the strongest match reads ~0.99 and the weakest ~0.6.
    dmin = min(dists) if dists else 0.0
    dmax = max(dists) if dists else 1.0
    span = (dmax - dmin) or 1.0

    citations = []
    for i, doc in enumerate(docs):
        meta = metas[i] or {}
        sim = round(0.99 - 0.39 * (float(dists[i]) - dmin) / span, 4)
        snippet = doc.strip().replace("\n", " ")
        citations.append({
            "pmid": _pmid_from(meta, ids[i], i),
            "title": _title_from(doc, meta),
            "similarity_score": sim,
            "abstract_snippet": (snippet[:300] + "…") if len(snippet) > 300 else snippet,
        })
    return {"citations": citations}
