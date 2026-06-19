#!/usr/bin/env python3
"""
build_index.py — Run this locally whenever you add/update knowledge base files.

Requirements (local only, NOT needed on Vercel):
    pip install sentence-transformers

Output:
    embeddings.json  (committed to repo root, loaded by api/rag.py at runtime)

Chunking strategy:
    - Split each .md file into sections by H2 headings (##)
    - Each section becomes one retrievable chunk
    - Overlap: first 2 lines of previous section prepended to next (context continuity)
"""

import json
import re
import sys
from pathlib import Path

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    print("ERROR: sentence-transformers not installed.")
    print("Run: pip install sentence-transformers")
    sys.exit(1)

# ── Config ────────────────────────────────────────────────────────────────────
MODEL_NAME = "all-MiniLM-L6-v2"   # 90 MB, strong semantic quality for its size
KB_DIR = Path(__file__).parent.parent / "knowledge_base"
OUTPUT_PATH = Path(__file__).parent.parent / "embeddings.json"
# ─────────────────────────────────────────────────────────────────────────────


def chunk_markdown(filepath: Path) -> list[dict]:
    """Split a markdown file into H2-delimited sections."""
    text = filepath.read_text(encoding="utf-8")
    source = filepath.stem

    # Split on ## headings
    raw_sections = re.split(r"(?m)^## ", text)
    chunks = []

    for i, section in enumerate(raw_sections):
        section = section.strip()
        if not section:
            continue

        # First block before any ## is treated as intro/overview
        if i == 0:
            heading = "Overview"
            body = section
        else:
            lines = section.splitlines()
            heading = lines[0].strip()
            body = "\n".join(lines[1:]).strip()

        if len(body.split()) < 20:
            continue  # skip near-empty sections

        chunk_text = f"[{source} — {heading}]\n\n{body}"
        chunks.append({
            "source": source,
            "chunk_id": f"{source}_{i}",
            "heading": heading,
            "text": chunk_text,
        })

    return chunks


def main():
    if not KB_DIR.exists() or not any(KB_DIR.glob("*.md")):
        print(f"No markdown files found in {KB_DIR}")
        print("Add your project .md files to knowledge_base/ first.")
        sys.exit(1)

    md_files = sorted(KB_DIR.glob("*.md"))
    print(f"Found {len(md_files)} knowledge base files:")
    for f in md_files:
        print(f"  {f.name}")

    print(f"\nLoading model: {MODEL_NAME} ...")
    model = SentenceTransformer(MODEL_NAME)

    all_chunks = []
    for md_file in md_files:
        chunks = chunk_markdown(md_file)
        print(f"  {md_file.name} → {len(chunks)} chunks")
        all_chunks.extend(chunks)

    print(f"\nEmbedding {len(all_chunks)} chunks ...")
    texts = [c["text"] for c in all_chunks]
    embeddings = model.encode(texts, show_progress_bar=True, convert_to_numpy=True)

    output = []
    for chunk, emb in zip(all_chunks, embeddings):
        output.append({
            **chunk,
            "embedding": emb.tolist(),
        })

    OUTPUT_PATH.write_text(json.dumps(output, indent=2), encoding="utf-8")
    print(f"\n✓ Wrote {len(output)} entries to {OUTPUT_PATH}")
    print("  Commit embeddings.json to your repo.")


if __name__ == "__main__":
    main()
