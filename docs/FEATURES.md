# FEATURES — spec sheet

One card per feature. IDs are stable — use them in commits (`feat(F-05): ...`), in BOARD.md, and when discussing work. Deep details live in SPEC.md (referenced per card); this sheet is the contract for "what done means."

---

## F-01 · Project scaffold

**Phase 0 · Depends on: —**
Next.js 15 (App Router, TS strict) + Tailwind + Prisma wired to Postgres, zod-validated `src/lib/env.ts`, `src/lib/db.ts`, Makefile targets functional.
**Done when:** `make dev` serves a page, `make migrate-dev` applies `prisma/schema.prisma` untouched, `make check` passes.

## F-02 · Mood wizard UI

**Phase 1 · Depends on: F-01 · Spec: SPEC §2.1**
Data-driven step tree in `src/config/steps.ts` (Horror w/ 4 sub-branches, Sci-Fi, Thriller, Comedy, Drama, Action + shared era/pacing steps). Full-screen cards, tiles, progress dots, back nav, framer-motion, mobile-first 390px. Summary screen carries an optional 200-char free-text note (SPEC §2.1).
**Done when:** completing the wizard yields a typed answers object; adding a genre is config-only (zero component edits).

## F-03 · LLM provider abstraction

**Phase 2 · Depends on: F-01 · Spec: PROMPTS.md**
`src/lib/llm/` — `index.ts` public API + `anthropic.ts`/`openai.ts`, selected by `LLM_PROVIDER`. JSON-only, zod-validated, one reinforced retry on parse failure, `max_tokens ≤ 600`, static system block positioned for prompt caching.
**Done when:** `getCandidates(prompt)` returns validated candidates from either provider by flipping only env vars.

## F-04 · TMDB integration & movie cache

**Phase 2 · Depends on: F-01 · Spec: SPEC §5**
`src/lib/tmdb.ts`: Bearer v4 auth, search-with-year (fallback w/o year, vote_count ≥ 50), detail + watch providers, 8s timeout + 1 retry, DB-backed cache via `Movie` (30-day refresh), `next/image` domain config.
**Done when:** a title+year resolves to a cached `Movie` row with poster; repeat lookups hit DB, not TMDB.

## F-05 · Recommendation pipeline

**Phase 2 · Depends on: F-02, F-03, F-04 · Spec: SPEC §3**
`POST /api/recommend`: pathHash cache (anonymous wizard, 7 days) → prompt build (Template A) → LLM → TMDB resolution → backfill via /similar → persist `RecSession` + 5 `Recommendation` rows. Anonymous session cookie.
**Done when:** wizard → 5 verified cards; identical anonymous path re-serves from cache (verified via logs); < 5 resolved triggers backfill.

## F-06 · Results & movie detail

**Phase 2 · Depends on: F-05 · Spec: SPEC §3, §5**
`/results/[sessionId]`: ranked cards (poster w342, title, year, rating, personalized reason). Tap → detail (overview, runtime, genres, watch providers w/ TMDB–JustWatch attribution).
**Done when:** results render from DB on revisit (no recompute); detail loads providers for the user's region with US fallback.

## F-07 · Auth & session claiming

**Phase 3 · Depends on: F-01 · Spec: SPEC §6, §3**
Auth.js v5 (Google + Resend magic link), Prisma adapter. On first login, claim anonymous `RecSession`s from cookie.
**Done when:** login works at 390px; a pre-login wizard session appears in the user's history post-signup.

## F-08 · Profile page

**Phase 3 · Depends on: F-06, F-07 · Spec: SPEC §6**
`/profile`: recommendation history grouped by date, saved watchlist, sign out. (Taste summary display arrives with F-10.)
**Done when:** history and watchlist reflect DB state; save/unsave round-trips from a movie card.

## F-09 · Feedback signals

**Phase 4 · Depends on: F-06, F-07 · Spec: SPEC §4.1**
❤️ LOVED / 👁 SEEN / ✕ NOT_FOR_ME + bookmark on every card → `POST /api/feedback` upserting `MovieFeedback` (+ `SavedMovie`). Optimistic UI.
**Done when:** each tap persists one upserted row; signals increment `TasteProfile.signalCount`.

## F-10 · Taste profile engine

**Phase 4 · Depends on: F-09 · Spec: SPEC §4.2, PROMPTS Template C**
`src/lib/taste.ts`: genreWeights recompute (frequency w/ decay, pure code) + LLM tasteSummary regen, lazily triggered at `signalCount ≥ 5` or 14 days. Summary shown on `/profile`. Logged-in wizard runs get the taste block appended (Template A).
**Done when:** exactly one regen fires after 5 signals (test via logs); summary visible on profile; logged-in wizard prompt includes it.

## F-11 · For You feed

**Phase 4 · Depends on: F-10 · Spec: SPEC §2.2, §3, PROMPTS Templates B & D**
`/for-you`: latest `FOR_YOU` batch from DB, refresh with 12h cooldown (bypassed by new signals), exclusion list (past recs + SEEN/NOT_FOR_ME, cap 60), empty state for new users, ✕ triggers Template D in-place swap.
**Done when:** page view = DB read only; no excluded title ever reappears; ✕ swaps the card without reloading the batch.

## F-12 · Failure modes & rate limiting

**Phase 5 · Depends on: F-05, F-11 · Spec: SPEC §7**
Friendly error screens for LLM-down (answers preserved, retry) and TMDB-down (serve cache, never show unverified data). Rate limits: 10/h per IP anonymous, 30/day per user.
**Done when:** killing each upstream in dev renders the designed screen, never a raw error; limits return 429 with friendly copy.

## F-13 · PWA & ship polish

**Phase 5 · Depends on: F-06, F-11 · Spec: SPEC §8 context**
`next-pwa`, manifest + icons, loading states on every route, seed script, Lighthouse mobile: installable + perf ≥ 90 on results.
**Done when:** installs to a phone home screen; Lighthouse targets met; `make seed` produces a demo-able app.
