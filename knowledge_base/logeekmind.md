# LogeekMind
tags: full-stack, Next.js, FastAPI, Supabase, Gemini API, EdTech, AI, Python, TypeScript, generative AI

LogeekMind is an AI-powered academic assistant that consolidates a student's entire learning workflow — note capture, summarisation, quiz generation, exam simulation, and audio conversion — into a single interface. Built to solve the passive learning problem: most students consume content without active recall, and most tools address one phase of study in isolation.

## Problem and Motivation
The passive learning problem is structural: students switch between a transcription tool, a summariser, a flashcard app, and a quiz generator, losing context at every handoff. LogeekMind was built to collapse that workflow into one coherent interface powered by a single AI engine, so the output of each phase feeds directly into the next.

## Version 1 — Streamlit Prototype
The original LogeekMind was a monolithic Streamlit application using the Google Gemini API. It validated the core product hypothesis: students would engage with AI-generated quizzes, audio lessons, and Socratic tutoring if the friction of switching tools was eliminated. The Streamlit version reached a live user base but exposed three hard limits: UI customisation was constrained by Streamlit's component model, server-side state made concurrent users conflict, and scaling AI endpoints independently from the UI was not possible in a monolithic architecture.

## Version 2 — Full-Stack Rebuild
LogeekMind 2.0 was a ground-up architectural rewrite driven by the scalability failures of v1, not a feature addition.

**Frontend: Next.js (React + TypeScript)**
Migrated from Streamlit's Python-rendered UI to a Next.js application. This unlocked server-side rendering for initial page loads, static site generation for marketing pages, and proper client-side interactivity without Streamlit's full-page rerun model. TypeScript enforced type contracts across the component tree, eliminating a class of runtime errors that were invisible in the Python prototype.

**Backend: FastAPI (Python)**
The AI logic was extracted into a standalone FastAPI service. Async request handling via Python's asyncio means AI requests (which are I/O-bound, waiting on Gemini API responses) do not block the event loop. Swagger UI autodocumentation came for free. The decoupled backend also means the AI service can be scaled independently from the frontend — a deployment option that was architecturally impossible in the Streamlit monolith.

**Database and Auth: Supabase (PostgreSQL)**
Supabase provides a managed PostgreSQL database and authentication layer. User sessions, learning history, and generated content are persisted across devices. Row-level security policies in PostgreSQL enforce that users can only read their own data at the database layer — not just at the application layer.

**AI Engine: Google Gemini API**
All generative features — summarisation, quiz generation, Socratic tutoring, exam simulation, and PDF-to-audio conversion — are powered by Gemini. Prompt engineering is the primary lever for output quality: each feature has a structured prompt with explicit output format constraints to make downstream parsing reliable.

## Core Features
- PDF/lecture audio transcription to text
- Smart summarisation (100-page PDF → 1-page structured summary)
- AI Socratic Tutor: explains concepts via analogies, not definitions
- Quiz Generator: uploads a slide deck, generates a practice exam
- Exam Simulator: timed, graded, with per-question explanations
- Notes-to-audio: converts written notes to audio for passive study
- GPA Calculator with target-score projections
- Homework Assistant with step-by-step reasoning

## Architectural Lesson
The v1 → v2 migration is the most technically defensible story in this project. The decision to rewrite rather than patch was based on a concrete diagnosis: Streamlit's rerun model, monolithic deployment, and limited async support were not fixable incrementally. The rewrite was scoped to the infrastructure layer; the AI logic (prompts, Gemini integration) was largely portable.

## Stack
Next.js, TypeScript, React, FastAPI, Python, Supabase, PostgreSQL, Google Gemini API, Vercel.
