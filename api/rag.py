"""
RAG retrieval module.
Loads pre-built embeddings from embeddings.json (committed to repo,
built locally via scripts/build_index.py using sentence-transformers).
At runtime on Vercel, only numpy is needed — no torch, no heavy models.
"""

import json
import os
import numpy as np
from pathlib import Path

# Resolve path relative to this file so it works both locally and on Vercel
_BASE = Path(__file__).parent.parent
_EMBEDDINGS_PATH = _BASE / "embeddings.json"


def _load_index():
    if not _EMBEDDINGS_PATH.exists():
        raise FileNotFoundError(
            f"embeddings.json not found at {_EMBEDDINGS_PATH}. "
            "Run scripts/build_index.py locally first."
        )
    with open(_EMBEDDINGS_PATH, "r") as f:
        data = json.load(f)
    vectors = np.array([entry["embedding"] for entry in data], dtype=np.float32)
    return data, vectors


def cosine_similarity(query_vec: np.ndarray, matrix: np.ndarray) -> np.ndarray:
    """Vectorised cosine similarity between a 1-D query and an N×D matrix."""
    q = query_vec / (np.linalg.norm(query_vec) + 1e-10)
    norms = np.linalg.norm(matrix, axis=1, keepdims=True) + 1e-10
    normed = matrix / norms
    return normed @ q


def retrieve(query_embedding: list[float], top_k: int = 4) -> list[dict]:
    """
    Return the top_k most relevant chunks for a given query embedding.
    Each result dict has: { source, chunk_id, text, score }
    """
    data, vectors = _load_index()
    q = np.array(query_embedding, dtype=np.float32)
    scores = cosine_similarity(q, vectors)
    top_indices = np.argsort(scores)[::-1][:top_k]
    results = []
    for idx in top_indices:
        entry = data[int(idx)]
        results.append({
            "source": entry["source"],
            "chunk_id": entry["chunk_id"],
            "text": entry["text"],
            "score": float(scores[idx]),
        })
    return results
