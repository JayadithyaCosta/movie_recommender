# Movie Recs — canonical project commands.
# Recipe lines are TAB-indented. Run `make help` to list targets.

PM := pnpm

.DEFAULT_GOAL := help

.PHONY: help
help: ## List available targets
	@grep -E '^[a-zA-Z0-9_.-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-14s\033[0m %s\n", $$1, $$2}'

.PHONY: install
install: ## Install dependencies
	$(PM) install

.PHONY: add
add: ## Add dependencies (PKG="a b", DEV=1 for devDependencies)
	$(PM) add $(if $(DEV),-D,) $(PKG)

.PHONY: dev
dev: ## Run the Next.js dev server
	$(PM) dev

.PHONY: build
build: ## Production build
	$(PM) build

.PHONY: start
start: ## Serve the production build
	$(PM) start

.PHONY: lint
lint: ## ESLint
	$(PM) lint

.PHONY: typecheck
typecheck: ## TypeScript type check
	$(PM) exec tsc --noEmit

.PHONY: format
format: ## Prettier write
	$(PM) exec prettier --write .

.PHONY: db-up
db-up: ## Start the local Postgres container (waits until healthy)
	docker compose up -d --wait

.PHONY: db-down
db-down: ## Stop the local Postgres container (keeps data)
	docker compose down

.PHONY: db-reset
db-reset: ## DESTRUCTIVE — stop Postgres and delete its volume
	docker compose down -v

.PHONY: db-logs
db-logs: ## Tail Postgres logs
	docker compose logs -f postgres

.PHONY: generate
generate: ## Regenerate Prisma client
	$(PM) exec prisma generate

.PHONY: migrate-dev
migrate-dev: ## Create/apply a dev migration (NAME=...)
	$(PM) exec prisma migrate dev $(if $(NAME),--name $(NAME),)

.PHONY: migrate
migrate: ## Apply migrations (deploy)
	$(PM) exec prisma migrate deploy

.PHONY: llm-smoke
llm-smoke: ## Live-check the configured LLM provider (LLM_PROVIDER=... to override)
	$(PM) exec tsx --env-file=.env scripts/llm-smoke.ts

.PHONY: tmdb-smoke
tmdb-smoke: ## Live-check TMDB resolution + Movie cache (needs db-up)
	$(PM) exec tsx --env-file=.env scripts/tmdb-smoke.ts

.PHONY: rec-smoke
rec-smoke: ## Run the wizard rec pipeline once (LLM_MODEL=bogus to test the fallback)
	$(PM) exec tsx --env-file=.env scripts/rec-smoke.ts

.PHONY: seed
seed: ## Seed demo data
	$(PM) exec tsx prisma/seed.ts

.PHONY: studio
studio: ## Open Prisma Studio
	$(PM) exec prisma studio

.PHONY: check
check: lint typecheck ## Lint + typecheck (pre-commit gate)

.PHONY: clean
clean: ## Remove build artifacts
	rm -rf .next node_modules/.cache
