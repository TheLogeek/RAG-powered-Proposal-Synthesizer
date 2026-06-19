# RAG Proposal Synthesizer — Project Context

> **Purpose of this file:** Complete context for any LLM session to pick up where the last one stopped. Update this file at the end of every working session.

---

## What This Is

A live, public web application that takes a raw job description as input, performs semantic search over a structured markdown portfolio knowledge base, and streams a hyper-specific, technically accurate cover letter/proposal via the Anthropic Claude API.

**Live use case:** Accelerating freelance/contract application velocity by auto-targeting portfolio evidence to each JD.

---

## Architecture Decisions (Final)

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | React + Vite | SPA, fast dev loop, no framework overhead |
| Hosting (frontend) | Vercel static | Free, CDN-distributed, zero config |
| Backend | Vercel Python Serverless Functions (`api/*.py`) | No Render needed — avoids separate backend host |
| Streaming | SSE via Vercel serverless (`BaseHTTPRequestHandler`) | Vercel supports streaming responses |
| Vector search | Pure numpy cosine similarity | No FAISS (native binary issues on Vercel); numpy ships with Python runtime |
| Embeddings (index time) | `sentence-transformers/all-MiniLM-L6-v2` (local script) | Demonstrates expertise in portfolio/README; NOT loaded at runtime |
| Embeddings (query time) | `@xenova/transformers` WASM in browser | Same model, zero server cost, cached in IndexedDB after first load |
| LLM | Anthropic `claude-sonnet-4-6` | Streaming, high quality, available via API |
| KB format | Structured `.md` files in `knowledge_base/` | Human-editable, git-versioned, simple |
| Index format | `embeddings.json` committed to repo root | Pre-built locally, loaded at runtime by `api/rag.py` |

**Why not Render:** Sentence-transformers + torch (~1.5 GB) kills Render free/starter tier (512 MB RAM). The browser WASM approach sidesteps this entirely.

**Why not FAISS:** FAISS requires compiled C++ extensions; Vercel Python runtime doesn't support arbitrary native binaries reliably. Numpy cosine similarity is sufficient for a KB of <1000 chunks.

---

## Repository Structure

```
rag-proposal-synthesizer/
├── vercel.json                  # Build config — routes /api/* to Python, /* to React
├── .env.example                 # ANTHROPIC_API_KEY template
├── .gitignore
├── embeddings.json              # PRE-BUILT INDEX — commit this, don't gitignore
├── project.md                   # This file
│
├── api/                         # Vercel Python serverless functions
│   ├── requirements.txt         # anthropic, numpy (only)
│   ├── rag.py                   # Cosine similarity retrieval over embeddings.json
│   ├── prompts.py               # SYSTEM_PROMPT + build_user_prompt()
│   ├── generate.py              # POST /api/generate — SSE streaming endpoint
│   └── kb.py                    # GET /api/kb — returns KB file metadata
│
├── knowledge_base/              # Markdown portfolio files (source of truth)
│   ├── aida.md
│   ├── basketball_predictor.md
│   └── logeek_mind.md
│
├── scripts/
│   └── build_index.py           # LOCAL ONLY — uses sentence-transformers to build embeddings.json
│
└── frontend/
    ├── package.json             # react, react-dom, vite
    ├── vite.config.js           # dev proxy: /api → localhost:3000
    ├── index.html               # IBM Plex Mono + Inter from Google Fonts
    └── src/
        ├── main.jsx
        ├── App.jsx              # Dashboard layout + SSE orchestration logic
        ├── app.css              # Full design system — dark, monospace-accented
        ├── embedQuery.js        # Browser-side embedding via @xenova/transformers WASM
        └── components/
            ├── KBBrowser.jsx    # Left panel — lists KB docs, highlights retrieved sources
            ├── JobInputPanel.jsx # Center panel — JD textarea + generate button
            └── ProposalOutput.jsx # Right panel — streams proposal, shows sources bar
```

---

## Data Flow (End to End)

```
1. User pastes job description into JobInputPanel
2. App.jsx calls embedQuery(jd) → loads Xenova/all-MiniLM-L6-v2 in browser WASM
   - First call: ~23 MB model download, cached in IndexedDB
   - Returns float32[] embedding array
3. POST /api/generate with { job_description, query_embedding }
4. api/generate.py:
   a. Calls rag.retrieve(query_embedding, top_k=4)
   b. rag.py loads embeddings.json, computes cosine similarity, returns top chunks
   c. Sends SSE event: `event: sources` with retrieved doc names + scores
   d. Calls anthropic.messages.stream() with SYSTEM_PROMPT + retrieved context
   e. Streams tokens as `event: token` SSE events
   f. Sends `event: done` when complete
5. App.jsx reads SSE stream:
   - sources event → sets highlightedSources → KBBrowser highlights those docs
   - token events → appends to proposal string → ProposalOutput renders
   - done event → sets status to 'done', shows Copy button
```

---

## API Endpoints

### `POST /api/generate`

**Body:**
```json
{
  "job_description": "string",
  "query_embedding": [0.123, -0.456, ...]  // 384-dim float array
}
```

**SSE Events emitted:**
| Event | Data | When |
|---|---|---|
| `sources` | `[{source, score}, ...]` | Before streaming starts |
| `token` | `"partial text"` | Each LLM token |
| `done` | `{}` | Stream complete |
| `error` | `{message}` | On failure |

### `GET /api/kb`

Returns array of:
```json
[{
  "filename": "aida.md",
  "title": "AIDA",
  "tags": ["machine learning", "NLP"],
  "word_count": 312,
  "preview": "AIDA is an AI-powered document analysis..."
}]
```

---

## Knowledge Base Format

Each `.md` file in `knowledge_base/` should follow this structure for best chunking:

```markdown
# Project Title
tags: tag1, tag2, tag3

Brief 1-2 sentence overview.

## Architecture Overview
...

## Key Technical Decision or Feature
...

## Stack
Tech, tech, tech.
```

**Chunking strategy** (in `scripts/build_index.py`):
- Split on `##` headings → each section = one chunk
- Chunk format: `[source — Heading]\n\nbody text`
- Sections under 20 words are skipped
- Output: `embeddings.json` array of `{source, chunk_id, heading, text, embedding}`

---

## Environment Variables

| Variable | Where set | Used by |
|---|---|---|
| `ANTHROPIC_API_KEY` | Vercel Dashboard → Environment Variables | `api/generate.py` |

Local dev: create `frontend/.env.local` with `VITE_API_URL=http://localhost:3000` if needed.

---

## Local Development Setup

```bash
# 1. Clone and install frontend deps
cd frontend && npm install

# 2. Install local-only indexing deps
pip install sentence-transformers

# 3. Add your .md files to knowledge_base/
# (see format above)

# 4. Build the index
python scripts/build_index.py
# → writes embeddings.json to repo root

# 5. Run frontend dev server
cd frontend && npm run dev

# 6. For API functions locally, use Vercel CLI:
npm i -g vercel
vercel dev   # runs both frontend and api/* functions
# Set ANTHROPIC_API_KEY in .env.local or vercel env
```

---

## Deployment

```bash
# First time
vercel

# Subsequent deploys
vercel --prod

# Set env var (one time)
vercel env add ANTHROPIC_API_KEY
```

Vercel auto-detects:
- `frontend/package.json` → static build → serves from `/`
- `api/*.py` → Python serverless functions → served from `/api/*`

---

## Design System

**Palette:**
- `--bg-0: #0d0d0f` — page background
- `--bg-1: #13131a` — panel backgrounds
- `--accent: #7c6af7` — purple, primary actions
- `--green: #3dd68c` — live/streaming indicators, match scores

**Typography:**
- `IBM Plex Mono` — labels, badges, metadata, code
- `Inter` — body text, proposal output

**Layout:** 3-column dashboard grid: `260px | 1fr | 1fr`
- Left: KB Browser (doc list, highlights retrieved sources post-generation)
- Center: Job input + generate button
- Right: Streamed proposal output + sources bar

---

## Current Status

| Item | Status |
|---|---|
| Project structure | ✅ Complete |
| `api/rag.py` | ✅ Complete |
| `api/prompts.py` | ✅ Complete |
| `api/generate.py` | ✅ Complete |
| `api/kb.py` | ✅ Complete |
| `scripts/build_index.py` | ✅ Complete |
| `frontend/` full UI | ✅ Complete |
| Sample KB files (3) | ✅ Scaffolded (replace with real project details) |
| `embeddings.json` | ⏳ Must be built locally (`python scripts/build_index.py`) |
| Vercel deployment | ⏳ Not yet deployed |
| Real KB content | ⏳ Replace sample .md files with actual project details |

---

## Immediate Next Steps

1. **Replace KB files** — `knowledge_base/aida.md`, `basketball_predictor.md`, `logeek_mind.md` contain scaffolded content. Fill them with real technical details from your actual projects.
2. **Build the index** — Run `python scripts/build_index.py` locally. This creates `embeddings.json`. Commit it.
3. **Set API key** — `vercel env add ANTHROPIC_API_KEY`
4. **Deploy** — `vercel --prod`
5. **Test the SSE stream** — Open browser devtools → Network → `generate` request → EventStream tab to verify events.

---

## Known Issues / Watch Points

- **Xenova WASM first load:** ~23 MB download on first use per browser. After that it's cached. Consider adding a loading indicator (already done in `ProposalOutput` via `status === 'embedding'`).
- **Vercel function cold starts:** Python functions have ~300–800ms cold start. First request after inactivity will feel slow.
- **embeddings.json size:** Each chunk embedding is 384 floats × 4 bytes. 100 chunks = ~150 KB JSON. 500 chunks = ~750 KB. Fine for the repo. If KB grows very large (1000+ chunks), consider splitting or switching to a lightweight vector DB.
- **SSE on Vercel:** Vercel serverless has a 10s default timeout on Hobby plan. Claude streaming should finish within that for proposals (200–280 words). Upgrade to Pro if timeout issues appear.

---

## Potential Enhancements (Post-MVP)

- [ ] Tone selector (formal / direct / startup-casual)
- [ ] Save/export proposals as PDF or copy-to-clipboard with formatting
- [ ] Multiple proposal variants (A/B)
- [ ] KB file upload UI (instead of editing markdown manually)
- [ ] Auth gate (if making it multi-user)
- [ ] Analytics: track which KB chunks get retrieved most
- [ ] Supabase pgvector migration if KB grows beyond ~500 chunks
