# BOARD — tick as you go

Task-level tracking for the features in `docs/FEATURES.md`. Rules:

- Work **top to bottom**; only start a feature whose dependencies are fully ticked.
- Tick a task (`- [x]`) the moment it's truly done — never ahead of reality, never in bulk at the end.
- The final **Acceptance** box of a feature may only be ticked after its FEATURES.md "Done when" is verified AND `make check` passes.
- Claude Code: update this file in the same commit as the work it reflects.

## Overview

- [x] F-01 Project scaffold
- [x] F-02 Mood wizard UI
- [x] F-03 LLM provider abstraction
- [x] F-04 TMDB integration & movie cache
- [x] F-05 Recommendation pipeline
- [x] F-06 Results & movie detail
- [ ] F-07 Auth & session claiming
- [ ] F-08 Profile page
- [ ] F-09 Feedback signals
- [ ] F-10 Taste profile engine
- [ ] F-11 For You feed
- [ ] F-12 Failure modes & rate limiting
- [ ] F-13 PWA & ship polish

---

## F-01 · Project scaffold

- [x] Next.js 15 + TS strict + Tailwind + ESLint/Prettier scaffolded
- [x] Prisma init; `prisma/schema.prisma` copied from kit unmodified; first migration applied
- [x] `src/lib/env.ts` (zod) + `src/lib/db.ts` singleton
- [x] All Makefile targets verified working
- [x] **Acceptance** (FEATURES F-01)

## F-02 · Mood wizard UI

- [x] `src/config/steps.ts` tree + types (6 genres, horror sub-branches, shared era/pacing)
- [x] StepCard / OptionGrid / ProgressDots components (mobile-first, 44px+ targets)
- [x] Back navigation + framer-motion slide transitions
- [x] Wizard state hook producing typed `WizardAnswers`
- [x] Optional free-text note on the summary screen (200 chars, skips shared cache in F-05)
- [x] Desktop layout: centered max-w-md column
- [x] **Acceptance** (FEATURES F-02)

## F-03 · LLM provider abstraction

- [x] `lib/llm/index.ts` public API + provider selection via env
- [x] `gemini.ts` implementation (default provider, free tier, schema-constrained JSON)
- [x] `anthropic.ts` and `openai.ts` implementations (paid swap path)
- [x] zod schemas in `lib/schemas.ts` (RecBatch, RecSingle, TasteSummary)
- [x] Reinforced single retry on parse failure; error surfaced per SPEC §7
- [x] **Acceptance** (FEATURES F-03) <!-- verified via `make llm-smoke` on Gemini (gemini-3.5-flash-lite;
      the 3.6-flash free-tier quota was exhausted at verification time). -->

## F-04 · TMDB integration & movie cache

- [x] `lib/tmdb.ts` client: Bearer auth, timeout, retry
- [x] search-with-year → fallback without year → vote_count ≥ 50 filter
- [x] `Movie` upsert cache with 30-day refresh
- [x] Detail + watch-providers fetchers; `next/image` domain config
- [x] **Acceptance** (FEATURES F-04)

## F-05 · Recommendation pipeline

- [x] `pathHash` normalization + `lib/cache.ts` (7-day shared cache, anonymous wizard only)
- [x] Prompt builder (Template A, optional taste block slot)
- [x] `POST /api/recommend`: LLM → TMDB resolve → backfill via /similar
- [x] Persist `RecSession` + 5 ranked `Recommendation` rows
- [x] Anonymous session cookie (signed) for later claiming
- [x] **Acceptance** (FEATURES F-05)

## F-06 · Results & movie detail

- [x] `/results/[sessionId]` ranked cards (poster, meta, reason)
- [x] Movie detail view: overview, runtime, genres, watch providers + attribution
- [x] Revisit renders from DB (no recompute)
- [x] **Acceptance** (FEATURES F-06)

## F-07 · Auth & session claiming

- [ ] Auth.js v5 + Prisma adapter; Google + Resend magic link
- [ ] Login/logout UI usable at 390px
- [ ] Anonymous session claiming on first login
- [ ] **Acceptance** (FEATURES F-07)

## F-08 · Profile page

- [ ] History grouped by date; watchlist grid
- [ ] Save/unsave from movie cards (round-trip)
- [ ] Sign out
- [ ] **Acceptance** (FEATURES F-08)

## F-09 · Feedback signals

- [ ] ❤️ / 👁 / ✕ / bookmark actions on cards (optimistic UI)
- [ ] `POST /api/feedback` upsert + `SavedMovie` handling
- [ ] `signalCount` increment on `TasteProfile`
- [ ] **Acceptance** (FEATURES F-09)

## F-10 · Taste profile engine

- [ ] genreWeights recompute (frequency + decay, pure code)
- [ ] Template C summary regen; lazy trigger (≥5 signals or 14 days), counter reset
- [ ] Taste summary shown on `/profile`
- [ ] Logged-in wizard prompts include taste block
- [ ] **Acceptance** (FEATURES F-10)

## F-11 · For You feed

- [ ] `/for-you` renders latest FOR_YOU batch from DB
- [ ] Refresh w/ 12h cooldown, bypassed by new signals
- [ ] Exclusion list assembly (past recs + SEEN/NOT_FOR_ME, cap 60) + post-resolve filter
- [ ] Empty state for users with no signals
- [ ] ✕ → Template D in-place card swap
- [ ] **Acceptance** (FEATURES F-11)

## F-12 · Failure modes & rate limiting

- [ ] LLM-down screen (answers preserved, retry)
- [ ] TMDB-down: cache-first, never unverified data
- [ ] Rate limits (10/h IP anon, 30/day user) → friendly 429
- [ ] **Acceptance** (FEATURES F-12)

## F-13 · PWA & ship polish

- [ ] next-pwa + manifest + icons; installable
- [ ] Loading/error states on every route
- [ ] `make seed` demo data
- [ ] Lighthouse mobile: perf ≥ 90 on results, PWA pass
- [ ] **Acceptance** (FEATURES F-13)
