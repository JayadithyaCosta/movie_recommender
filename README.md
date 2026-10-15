# Movie Recs

Mobile-first Next.js app that gives you your **top 5 movie recommendations** — either from a
3–4 tap mood wizard ("I feel like…") or, once you're logged in, from a taste profile built
out of your own activity.

The LLM only ever proposes `{title, year, reason}`; every piece of metadata you actually see
(poster, rating, runtime, overview) is resolved against TMDB.

## Getting started

```bash
cp .env.example .env      # DATABASE_URL, AUTH_SECRET, TMDB_READ_TOKEN, GEMINI_API_KEY
make install              # install dependencies
make db-up                # start Postgres in Docker (port 5433)
make migrate-dev          # apply migrations
make seed                 # optional: demo user with history, ratings, watchlist
make dev                  # http://localhost:3000
```

**Demo login (dev):** with no `AUTH_RESEND_KEY`, `/login` prints the magic link to the
server log — sign in as `demo@movierecs.test` after `make seed`. Google sign-in appears
once `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` are set.

**No LLM key?** The app still works: if Gemini is unavailable, picks come from TMDB
`/discover` driven by the wizard config (still 100% TMDB-verified).

Node version is pinned in `.nvmrc` (Node 22). Package manager is pnpm via corepack.

## Commands

`make help` lists everything. The Makefile is the source of truth for project commands —
use it rather than raw `pnpm`/`prisma` invocations.

| Target                                            | Does                                                                    |
| ------------------------------------------------- | ----------------------------------------------------------------------- |
| `make dev` / `make build` / `make start`          | Next.js dev server / prod build / serve build                           |
| `make check`                                      | `lint` + `typecheck` (pre-commit gate)                                  |
| `make db-up` / `db-down` / `db-logs` / `db-reset` | Dockerized Postgres lifecycle                                           |
| `make migrate-dev NAME=…` / `make migrate`        | Prisma migrations (dev / deploy)                                        |
| `make generate` / `make studio` / `make seed`     | Prisma client, Studio, demo data                                        |
| `make llm-smoke` / `tmdb-smoke` / `rec-smoke`     | Live checks: LLM, TMDB cache, full pipeline                             |
| `make lighthouse URL=…`                           | Mobile Lighthouse audit of a running server                             |
| `make add PKG="…"`                                | Add dependencies (`DEV=1` for dev deps)                                 |
| `make deploy` / `deploy-preview` / `migrate-prod` | Vercel deploys + prod migrations (see [docs/DEPLOY.md](docs/DEPLOY.md)) |

## Docs

| File                                 | What's in it                                               |
| ------------------------------------ | ---------------------------------------------------------- |
| [CLAUDE.md](CLAUDE.md)               | Working agreement: golden rules, stack, conventions        |
| [docs/BOARD.md](docs/BOARD.md)       | Live progress board — tick as you go                       |
| [docs/FEATURES.md](docs/FEATURES.md) | F-01…F-13 cards with scope + "Done when"                   |
| [docs/SPEC.md](docs/SPEC.md)         | Product spec: flows, caching, taste profile, API contracts |
| [docs/PROMPTS.md](docs/PROMPTS.md)   | The four LLM prompt templates                              |
| [docs/PLAN.md](docs/PLAN.md)         | Phase groupings                                            |

## Stack

Next.js 15 (App Router, TS strict) · Tailwind CSS v4 · Prisma + PostgreSQL · Auth.js v5 ·
Claude Haiku 4.5 (OpenAI swappable via `LLM_PROVIDER`) · TMDB API v3 · PWA via `next-pwa`
