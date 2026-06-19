"""
POST /api/generate
Body: { job_description: str, query_embedding: float[] }

Vercel Python serverless function.
- Retrieves top-K portfolio chunks via cosine similarity
- Streams a tailored proposal from Groq (llama-3.1-8b-instant) using SSE
"""

import json
import os
from http.server import BaseHTTPRequestHandler

from groq import Groq

from rag import retrieve
from prompts import SYSTEM_PROMPT, build_user_prompt


class handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(200)
        self._set_cors()
        self.end_headers()

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)

        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            self._error(400, "Invalid JSON body")
            return

        job_description = payload.get("job_description", "").strip()
        query_embedding = payload.get("query_embedding", [])

        if not job_description:
            self._error(400, "job_description is required")
            return
        if not query_embedding:
            self._error(400, "query_embedding is required")
            return

        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            self._error(500, "GROQ_API_KEY not configured")
            return

        # Retrieve relevant portfolio chunks
        try:
            chunks = retrieve(query_embedding, top_k=4)
        except FileNotFoundError as e:
            self._error(500, str(e))
            return

        user_prompt = build_user_prompt(job_description, chunks)

        # Stream Groq response via SSE
        self.send_response(200)
        self._set_cors()
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Accel-Buffering", "no")
        self.end_headers()

        client = Groq(api_key=api_key)

        # Send retrieved sources as first SSE event so UI can display them
        sources_event = json.dumps([
            {"source": c["source"], "score": round(c["score"], 3)} for c in chunks
        ])
        self._sse("sources", sources_event)

        try:
            stream = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                max_tokens=600,
                stream=True,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
            )

            for chunk in stream:
                delta = chunk.choices[0].delta.content
                if delta:
                    self._sse("token", json.dumps(delta))

            self._sse("done", "{}")
        except Exception as e:
            self._sse("error", json.dumps({"message": str(e)}))

    # ------------------------------------------------------------------ helpers

    def _sse(self, event: str, data: str):
        line = f"event: {event}\ndata: {data}\n\n"
        try:
            self.wfile.write(line.encode())
            self.wfile.flush()
        except BrokenPipeError:
            pass  # client disconnected

    def _error(self, code: int, message: str):
        self.send_response(code)
        self._set_cors()
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode())

    def _set_cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
