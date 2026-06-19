"""
GET /api/kb
Returns list of knowledge base files with metadata for the KB Browser panel.
"""

import json
import os
from http.server import BaseHTTPRequestHandler
from pathlib import Path

_KB_DIR = Path(__file__).parent.parent / "knowledge_base"


class handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(200)
        self._set_cors()
        self.end_headers()

    def do_GET(self):
        if not _KB_DIR.exists():
            self._respond(200, [])
            return

        files = []
        for md_file in sorted(_KB_DIR.glob("*.md")):
            content = md_file.read_text(encoding="utf-8")
            lines = content.splitlines()

            # Extract title from first H1
            title = md_file.stem.replace("_", " ").title()
            for line in lines:
                if line.startswith("# "):
                    title = line[2:].strip()
                    break

            # Extract tags from frontmatter-style "tags:" line if present
            tags = []
            for line in lines:
                if line.lower().startswith("tags:"):
                    tags = [t.strip() for t in line.split(":", 1)[1].split(",")]
                    break

            # Word count as proxy for content depth
            word_count = len(content.split())

            files.append({
                "filename": md_file.name,
                "title": title,
                "tags": tags,
                "word_count": word_count,
                "preview": " ".join(content.split()[:30]) + "...",
            })

        self._respond(200, files)

    def _respond(self, code: int, data):
        self.send_response(code)
        self._set_cors()
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def _set_cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
