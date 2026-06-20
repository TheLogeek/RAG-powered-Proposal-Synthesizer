import json
import os
import numpy as np
from pathlib import Path

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
    q = query_vec / (np.linalg.norm(query_vec) + 1e-10)
    norms = np.linalg.norm(matrix, axis=1, keepdims=True) + 1e-10
    normed = matrix / norms
    return normed @ q


def retrieve(
    query_embedding: list[float],
    top_k: int = 4,
    excluded_sources: list[str] | None = None,
    user_embeddings: list[dict] | None = None,
) -> list[dict]:
    data, vectors = _load_index()
    q = np.array(query_embedding, dtype=np.float32)

    if excluded_sources:
        keep_mask = np.array([
            entry["source"] not in excluded_sources for entry in data
        ], dtype=bool)
        data = [d for d, m in zip(data, keep_mask) if m]
        vectors = vectors[keep_mask]

    if user_embeddings:
        for ue in user_embeddings:
            data.append({
                "source": ue["source"],
                "chunk_id": ue["chunk_id"],
                "heading": ue.get("heading", ""),
                "text": ue["text"],
            })
        user_vecs = np.array([ue["embedding"] for ue in user_embeddings], dtype=np.float32)
        vectors = np.vstack([vectors, user_vecs]) if vectors.size else user_vecs

    if vectors.size == 0:
        return []

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
