.PHONY: dev prod dev-down prod-down dev-logs prod-logs dev-reset prod-reset build dev-build db-migrate db-push clean

# ── Desenvolvimento ──────────────────────────────────────────────────

dev:                         ## Sobe o ambiente de dev com hot reload
	docker compose -f docker-compose.dev.yml up --build

dev-down:                    ## Para e remove os containers de dev
	docker compose -f docker-compose.dev.yml down

dev-logs:                    ## Segue os logs do ambiente de dev
	docker compose -f docker-compose.dev.yml logs -f

dev-reset:                   ## Recria o ambiente de dev do zero (perde dados do banco!)
	docker compose -f docker-compose.dev.yml down -v
	docker compose -f docker-compose.dev.yml up --build

dev-build:                   ## Apenas compila a imagem de dev
	docker compose -f docker-compose.dev.yml build

# ── Produção ─────────────────────────────────────────────────────────

prod:                        ## Sobe o ambiente de produção
	docker compose up --build -d

prod-down:                   ## Para e remove os containers de produção
	docker compose down

prod-logs:                   ## Segue os logs do ambiente de produção
	docker compose logs -f

prod-reset:                  ## Recria o ambiente de produção do zero (perde dados do banco!)
	docker compose down -v
	docker compose up --build -d

build:                       ## Apenas compila a imagem de produção
	docker compose build

# ── Banco de dados ───────────────────────────────────────────────────

db-migrate:                  ## Roda migrations no container de dev
	docker compose -f docker-compose.dev.yml exec app npx drizzle-kit migrate

db-push:                     ## Push direto do schema (dev apenas)
	docker compose -f docker-compose.dev.yml exec app npx drizzle-kit push

db-generate:                 ## Gera migration a partir do schema (roda no host)
	npx drizzle-kit generate

# ── Utilidades ───────────────────────────────────────────────────────

clean:                       ## Remove tudo: containers, volumes e imagens do projeto
	docker compose -f docker-compose.dev.yml down -v 2>/dev/null; true
	docker compose down -v 2>/dev/null; true

help:                        ## Lista todos os targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
