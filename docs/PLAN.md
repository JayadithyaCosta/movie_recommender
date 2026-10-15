# PLAN — build order

Work strictly phase by phase. Each phase must meet its acceptance criteria (`make lint`, `make typecheck`, and `make build` green) before starting the next. Commit per phase minimum.

## Phase 0 — Scaffold

- Next.js 15 + TS strict + Tailwind + Prisma init; copy `prisma/schema.prisma` from this kit as-is; `src/lib/env.ts` (zod-validated env); `src/lib/db.ts`; Makefile targets working.
- ✅ `make dev` serves a placeholder page; `make migrate-dev` applies the schema; `make studio` opens.

## Phase 1 — Wizard (UI only)

- `src/config/steps.ts` tree: Horror (4 sub-branches), Sci-Fi, Thriller, Comedy, Drama, Action + shared era/pacing steps.
- `/discover` renders the tree: full-screen cards, option tiles, progress dots, back navigation, framer-motion transitions, answers held in client state. Mobile-first (390px), desktop centered column.
- ✅ Completing the wizard logs the final answers object; adding a genre in config requires zero component changes.

## Phase 2 — Recommendation pipeline (anonymous)

- `lib/llm` abstraction (anthropic + openai, env-selected), `lib/tmdb.ts`, `lib/schemas.ts`, `lib/cache.ts` (pathHash), `POST /api/recommend` implementing SPEC §3, `/results/[sessionId]` with movie cards + detail view.
- Anonymous session cookie for later claiming.
- ✅ Wizard → 5 verified TMDB-backed cards with posters and personalized reasons; identical wizard path within 7 days returns cached results (no LLM call — verify via log); unresolvable titles are backfilled.

## Phase 3 — Auth + profile basics

- Auth.js v5 (Google; email magic link in dev only, logged to console), `/profile` with recommendation history and saved watchlist, save button on cards, anonymous session claiming on first login.
- ✅ Login works on mobile viewport; pre-login wizard session appears in history after signup.

## Phase 4 — Feedback + taste profile + For You

- `POST /api/feedback` with ❤️ / 👁 / ✕ on cards; `lib/taste.ts` (genreWeights recompute + Template C summary regen with lazy trigger rules from SPEC §4.2); Template A gains taste block for logged-in wizard runs; `/for-you` page with stored batch, cooldown-gated refresh, empty state; Template D replace-one-pick on ✕.
- ✅ 5 feedback signals trigger exactly one summary regen; For You excludes all previously recommended/seen titles; ✕ swaps the card in-place.

## Phase 5 — Polish + ship

- PWA (`next-pwa`, manifest, icons), rate limiting (SPEC §7), error/loading states for every route (LLM-down and TMDB-down paths), TMDB/JustWatch attribution, Lighthouse mobile pass (PWA installable, perf ≥ 90 on results page), seed script for demo data.
- ✅ Installs to an Android/iOS home screen; failure modes render friendly screens, never raw errors.
