"""BioBERT query embedding (Section 6.2). Lazily loads the model once."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
import config  # noqa: E402

_model = None


def _get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer(config.EMBEDDING_MODEL)
    return _model


def embed(text: str):
    """Return a python list embedding for a single query string."""
    model = _get_model()
    vec = model.encode([text])[0]
    return vec.tolist()
