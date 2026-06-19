# RAG-Powered Proposal Synthesizer

A live AI system that generates hyper-specific, technically accurate freelance proposals and cover letters by performing semantic search over a structured portfolio knowledge base.

**[Live Demo →](https://rag-powered-proposal-synthesizer.vercel.app/)**

---

## The Problem

Applying for remote data science and developer contracts requires tailoring every proposal to the specific job description — pulling the right project, the right architecture detail, the right metric. Doing that manually across a full portfolio for every application is slow, cognitively expensive, and inconsistent.

## The Solution

Paste a job description. The system embeds it, searches a curated knowledge base of engineering work, retrieves the most semantically relevant portfolio evidence, and streams a targeted proposal — zero fluff, no generic openers, grounded entirely in real project context.

---

## System Architecture

```
Job Description (user input)
        │
        ▼
┌─────────────────────────┐
│  Browser Embedding      │  all-MiniLM-L6-v2 via WASM
│  @xenova/transformers   │  384-dim float vector
└────────────┬────────────┘
             │  query_embedding[]
             ▼
┌─────────────────────────┐
│  POST /api/generate     │  Vercel Python Serverless
│                         │
│  Cosine Similarity      │  numpy · no FAISS
│  over embeddings.json   │  pre-built index (committed)
│                         │
│  Top-4 chunks retrieved │
│  + source scores        │
└────────────┬────────────┘
             │  retrieved context
             ▼
┌─────────────────────────┐
│  Groq Inference         │  llama-3.1-8b-instant
│  Structured prompt      │  streamed via SSE
└────────────┬────────────┘
             │  token stream
             ▼
┌─────────────────────────┐
│  React Dashboard        │  Vercel Static
│  3-panel UI             │  KB Browser · Input · Output
└─────────────────────────┘
```

---

## RAG Pipeline — Technical Decisions

### Embeddings: Browser WASM instead of a server model
`sentence-transformers/all-MiniLM-L6-v2` is used to build the index locally via `scripts/build_index.py`. At query time, the same model runs in the browser via `@xenova/transformers` (WASM) — eliminating a server-side embedding call entirely. The model (~23 MB quantized) downloads once and is cached in the browser's IndexedDB.

This means the backend receives a raw float vector and only needs `numpy` to do retrieval — no `torch`, no `sentence-transformers` at runtime, no memory pressure on the serverless function.

### Vector Search: Cosine similarity over a committed JSON index
The knowledge base is chunked by `## heading` boundaries, embedded locally, and stored as `embeddings.json` committed to the repo. The serverless function loads this file, computes vectorised cosine similarity with `numpy`, and returns the top-4 chunks. No vector database, no FAISS binary dependencies — just a float matrix and a dot product.

### Chunking Strategy
Each `.md` file in `knowledge_base/` is split on `##` headings. Each section becomes one retrievable chunk, prefixed with `[source — heading]` for grounding. Sections under 20 words are skipped. This gives the retriever section-level precision rather than full-document retrieval.

### Streaming: SSE from a Python serverless function
The Groq response is streamed token-by-token via Server-Sent Events from a Vercel Python serverless function (`BaseHTTPRequestHandler`). The frontend reads the SSE stream, painting tokens to the UI as they arrive. A `sources` event is emitted before the first token, so the KB Browser panel can highlight the retrieved documents with their relevance scores before generation completes.

---

## Knowledge Base

The KB consists of three structured markdown files covering real engineering projects:

| Project | Domain | Key Concepts |
|---|---|---|
| **AIDA** | ML preprocessing pipeline | Data leakage prevention, SMOTE, imputation strategy, model-aware scaling, before/after evaluation |
| **PULSE AI** | EPL match prediction | Stacked ensemble (XGBoost + LightGBM + GBM + RF), Elo ratings, 200+ engineered features, meta-learner design |
| **LogeekMind** | AI academic assistant | Streamlit → Next.js + FastAPI migration, Supabase, Gemini API, async architecture, prompt engineering |

Each file follows a consistent `##` section structure so the chunker produces coherent, self-contained retrievable units.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite |
| Styling | Raw CSS, IBM Plex Mono + Inter |
| Browser Embedding | @xenova/transformers (WASM) |
| Backend | Python Serverless Functions (Vercel) |
| Vector Search | numpy cosine similarity |
| LLM | Groq — llama-3.1-8b-instant |
| Hosting | Vercel (frontend + API) |
| Index Format | embeddings.json (pre-built, committed) |

---

## Project Structure

```
rag-proposal-synthesizer/
├── api/
│   ├── generate.py          # POST /api/generate — SSE streaming endpoint
│   ├── kb.py                # GET /api/kb — knowledge base metadata
│   └── requirements.txt     # groq, numpy
├── lib/
│   ├── rag.py               # Cosine similarity retrieval
│   └── prompts.py           # System prompt + user prompt builder
├── knowledge_base/
│   ├── aida.md
│   ├── pulse_ai.md
│   └── logeekmind.md
├── scripts/
│   └── build_index.py       # Local indexer — uses sentence-transformers
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Dashboard layout + SSE orchestration
│   │   ├── embedQuery.js    # Browser-side WASM embedding
│   │   └── components/
│   │       ├── KBBrowser.jsx
│   │       ├── JobInputPanel.jsx
│   │       └── ProposalOutput.jsx
│   └── package.json
├── embeddings.json          # Pre-built vector index (committed)
└── vercel.json
```

---

## Running Locally

**Prerequisites:** Python 3.10+, Node.js 18+, a [Groq API key](https://console.groq.com)

```bash
# 1. Install indexing dependencies
pip install sentence-transformers

# 2. Build the vector index
python scripts/build_index.py
# → writes embeddings.json to project root

# 3. Install frontend dependencies
cd frontend && npm install && cd ..

# 4. Set environment variable
echo GROQ_API_KEY=your_key_here > .env.local

# 5. Install Vercel CLI and run
npm install -g vercel
vercel dev
```

Open `http://localhost:3000`

---

## Adding to the Knowledge Base

Create a new `.md` file in `knowledge_base/` using this structure:

```markdown
# Project Name
tags: tag1, tag2, tag3

One or two sentence overview.

## Architecture
...

## Key Technical Decision
...

## Stack
Tech, tech, tech.
```

Then rebuild the index:
```bash
python scripts/build_index.py
git add embeddings.json && git commit -m "rebuild: add [project name] to KB"
```

---

## Environment Variables

| Variable | Where |
|---|---|
| `GROQ_API_KEY` | Vercel Dashboard → Environment Variables |

---

Built by [Solomon Adenuga](https://github.com/SolomonAdenuga)
