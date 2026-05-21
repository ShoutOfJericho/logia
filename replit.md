# Logia

A quiet, intentional web app for reading Scripture aloud and capturing the
thoughts you hear yourself think.

## Overview

The user opens a passage (e.g. *1 Samuel 17*), reads it aloud, and switches
between **Reading** and **Reflection** modes. While they speak, Logia:

1. Transcribes via the browser's Web Speech API and applies phonetic correction
   so biblical proper nouns (Jeshurun, Nehushtan, Jehoshaphat, …) come through
   correctly.
2. Analyzes the user's voice in real time (F0, jitter, shimmer, HNR, RMS) and
   computes a normalized excitement score per segment.
3. Detects "aha moment" phrases like *"this is really powerful"*, *"the lesson
   here…"*, *"what stands out is…"*.

Each session is saved with its transcript, voice analysis per segment, and
detected aha moments. The dashboard shows recent sessions, a streak counter,
recent insights, and where the user's voice has consistently risen.

## Architecture

Pnpm monorepo with:

- **`artifacts/logia`** — React + Vite web app at `/`, port `22101`.
  - `src/App.tsx` — router + lexicon loader.
  - `src/pages/`
    - `Dashboard.tsx` — landing, with stats + recent sessions + recent aha.
    - `NewSession.tsx` — book/chapter picker with quick-reference parser.
    - `LiveSession.tsx` — split view (passage + capture), Web Speech +
      `VoiceAnalyzer`, mode toggle, live excitement meter.
    - `SessionReview.tsx` — full transcript with timeline SVG, per-segment
      voice stats, aha-moment cards, edit-title and delete-session.
    - `SessionsLibrary.tsx` — searchable, month-grouped list.
    - `Insights.tsx` — aggregate metrics and "where you came alive" passages.
  - `src/lib/`
    - `bibleLexicon.ts` — Metaphone + Jaro-Winkler correction; aha-phrase
      regex matcher.
    - `voiceAnalysis.ts` — `VoiceAnalyzer` class wrapping
      `MediaStreamAudioSourceNode` and an autocorrelation-based F0 estimator.
    - `bibleBooks.ts`, `format.ts`.
  - `src/hooks/useSpeechRecognition.ts` — wraps the Web Speech API, with
    auto-restart and a `consumeFinal()` helper for atomic flushes.
  - `src/components/` — `AppLayout`, `PageHeader`, `StatTile`.

- **`artifacts/api-server`** — Express + Drizzle backend at `/api`.
  - `src/routes/lexicon.ts` — exposes the Bible-name list and aha patterns.
  - `src/routes/passages.ts` — proxies bible-api.com (WEB translation).
  - `src/routes/sessions.ts` — CRUD with `appendSegments` / `replaceSegments`
    / `finalize` semantics. Recomputes aggregates on every write.
  - `src/routes/dashboard.ts` — summary, recent aha moments, excited passages.
  - `src/lib/bibleNames.ts` — curated Bible names + aha-phrase patterns.
  - `src/lib/sessionAggregates.ts` — pure helpers for duration, excitement,
    aha-moment join, and streak calc.

- **`lib/api-spec/openapi.yaml`** — single source of truth for the API.
- **`lib/api-zod`**, **`lib/api-client-react`** — generated from the spec.
- **`lib/db/src/schema/sessions.ts`** — `sessionsTable` (uuid PK) and
  `segmentsTable` (text PK; client-generated for idempotent appends).

## Color & typography

- **Cream / parchment** background with **deep ink** foreground and a
  **burnt-amber** primary accent; **deep burgundy** secondary accent.
- `Cormorant Garamond` for Scripture (`font-scripture`), `Lora` for body serif
  (`font-serif`), `Inter` for UI (`font-sans`). Verse numbers rendered in a
  smaller sans superscript with the primary color.

## Voice & transcript

- The Web Speech API drives transcripts; `VoiceAnalyzer` runs in parallel via
  `getUserMedia` (no echo cancellation, no AGC) and samples ~250ms frames.
- Excitement score blends z-scored F0 elevation, amplitude, and recent F0
  variability through a sigmoid; rolling baseline of ~30s.
- When the user switches mode (or pauses / ends), the buffered final-text
  becomes a `TranscriptSegment` with computed voice stats and is `appendSegments`-PATCHed
  to `/api/sessions/:id`. Aha-phrase detection runs on each reflection segment.

## Running locally

- `artifacts/api-server: API Server` — Express dev server.
- `artifacts/logia: web` — Vite dev server.
- `pnpm run typecheck:libs` — rebuild shared lib types after schema/spec
  changes. Run before per-artifact typecheck.

## Database

PostgreSQL via `DATABASE_URL`. Two tables:

- `sessions(id uuid pk, book, chapter, title, started_at, ended_at, …aggregates)`
- `segments(id text pk, session_id fk, kind, text, started_at_ms, ended_at_ms,
  excitement, f0_mean, f0_std, jitter, shimmer, hnr, is_aha, aha_phrase)`

Apply schema with `pnpm --filter @workspace/db run db:push` (use `--force` if
needed).
