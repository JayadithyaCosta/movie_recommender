# CLAUDE.md — Movie Recs

Mobile-first Next.js app that gives users their **top 5 movie recommendations**.
Two modes:

1. **Mood wizard** ("I feel like…") — 3–4 full-screen tap steps (genre → sub-genre → era/pacing), no forms. Works logged-out.
2. **For You** (logged in) — recommendations generated from the user's accumulated taste profile.

Read `docs/SPEC.md` before implementing any feature. Build in the order given in `docs/PLAN.md`.

## Golden rules

1. **LLM for taste, TMDB for facts.** The LLM only ever outputs `{title, year, reason}` candidates. All displayed metadata (title, year, poster, rating, overview) MUST come from TMDB after resolution. Never render LLM-generated metadata directly. If a title doesn't resolve on TMDB, drop it and backfill (see SPEC §5).
2. **Makefile is the source of truth for commands.** Before running any project task (dev server, build, lint, typecheck, migrations, seed, codegen), check the `Makefile` and run the matching `make` target. If no target covers the task, ADD one (tab-indented recipe, `.PHONY`, `## comment` for `make help`) and run that — never run repeatable project commands raw.
3. **The wizard is data-driven.** All steps/branches live in `src/config/steps.ts` as a tree. Adding a genre or question is a config edit — never hardcode step logic in components.
4. **All LLM calls go through `src/lib/llm/index.ts`.** Provider (Gemini/Anthropic/OpenAI) is selected by `LLM_PROVIDER` env var. No direct SDK calls anywhere else. JSON-only outputs, validated with zod, `max_tokens` ≤ 600.
5. **Mobile-first.** Design every screen at 390px width first; desktop is an enhancement (centered column, max-w-md for the wizard). Big tap targets (min 44px), thumb-reachable primary actions.
6. **Never repeat recommendations.** Every rec pipeline call receives an exclusion list (prior recs + SEEN/NOT_FOR_ME feedback). Filter again post-TMDB-resolution as a safety net.
7. **Work from the board.** `docs/BOARD.md` is the live source of truth for progress. Before starting work, open it and pick the topmost feature whose dependencies are fully ticked. Tick each task box the moment it's actually done — in the same commit as the work — and tick a feature's **Acceptance** box only after its "Done when" in `docs/FEATURES.md` is verified and `make check` passes. Never tick ahead of reality, never bulk-tick.

## Stack

- Next.js 15 (App Router, TypeScript strict), Tailwind CSS, framer-motion
- Prisma + PostgreSQL (Neon/local Postgres in dev)
- Auth.js v5 (Prisma adapter) — email magic link + Google
- LLM: Gemini `gemini-3.6-flash` default (only provider of the three with a free API tier); Anthropic/OpenAI swappable via `LLM_PROVIDER`
- TMDB API v3 for all movie data; `next-pwa` for installability

## Commands

Run `make help` for the full list. Key targets: `make dev`, `make build`, `make lint`, `make typecheck`, `make migrate-dev`, `make generate`, `make seed`, `make studio`.

## Structure

```
src/
├── app/
│   ├── (app)/discover/          # wizard
│   ├── (app)/results/[sessionId]/
│   ├── (app)/profile/           # saved, history, taste summary
│   ├── (app)/for-you/
│   └── api/                     # recommend, feedback, auth
├── components/wizard/  components/movie/  components/ui/
├── config/steps.ts              # wizard tree (data-driven)
├── lib/llm/                     # index.ts + gemini.ts + anthropic.ts + openai.ts
├── lib/tmdb.ts  lib/cache.ts  lib/db.ts  lib/taste.ts
└── prisma/schema.prisma
```

## Conventions

- TypeScript strict; no `any`. Validate all external data (LLM output, TMDB responses, API bodies) with zod schemas in `src/lib/schemas.ts`.
- Server Components by default; `"use client"` only where interaction demands it (wizard steps, feedback buttons).
- Route handlers thin; business logic in `src/lib/`. Errors: never throw raw LLM/TMDB failures to the client — degrade gracefully (SPEC §7).
- Env vars are read only in `src/lib/env.ts` (zod-validated), imported everywhere else.
- Commit style: conventional commits (`feat:`, `fix:`, `chore:`).

## Reference docs

- `docs/BOARD.md` — **tickable task board; live progress tracker (update it as you work)**
- `docs/FEATURES.md` — spec sheet: one card per feature (F-01…F-13) with scope + "Done when"
- `docs/SPEC.md` — product spec: flows, caching, taste profile, API contracts
- `docs/PROMPTS.md` — the 4 LLM prompt templates (use verbatim as starting points)
- `docs/PLAN.md` — phase groupings (phases map to feature IDs; BOARD is the task-level truth)
- `prisma/schema.prisma` — complete data model (use as-is for Phase 0)
- `.env.example` — required environment variables
