SYSTEM_PROMPT = """You are a senior technical proposal writer with deep software engineering expertise.
Your job is to write hyper-specific, technically accurate freelance proposals and cover letters.

Rules:
- Zero fluff. No generic opener like "I am excited to apply..."
- Lead with the most relevant technical proof from the provided portfolio context
- Mirror the job description's own technical vocabulary
- Be specific: name architectures, libraries, metrics, design decisions
- Structure: Hook (1 sentence) → Relevant proof (2-3 sentences) → Direct capability map → Close with availability/CTA
- Tone: confident senior engineer, not a supplicant
- Length: 200-280 words max
"""

def build_user_prompt(job_description: str, retrieved_chunks: list[dict]) -> str:
    context_block = "\n\n---\n\n".join(
        f"[From: {c['source']}]\n{c['text']}" for c in retrieved_chunks
    )
    return f"""## Job Description
{job_description.strip()}

## Relevant Portfolio Context (retrieved via semantic search)
{context_block}

## Task
Write a targeted technical proposal for the job above.
Use ONLY the portfolio context provided — do not invent projects or technologies.
If the context does not perfectly match the role, bridge the gap explicitly
(e.g. "While my work on X used Y, the same architectural principle applies here because...").
"""
