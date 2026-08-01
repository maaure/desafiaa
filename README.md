# N-de-Agua — Plataforma de Quizzes em Tempo Real

Plataforma de quizzes ao vivo no estilo Kahoot!: Apresentadores autenticados criam questionários e conduzem partidas; Participantes anônimos entram via PIN de 6 dígitos e respondem em tempo real (desafia.fun).

## Stack

| Camada        | Tecnologia                                    |
| ------------- | --------------------------------------------- |
| Backend       | Fastify 5 + Socket.IO 4 + Drizzle ORM + Zod   |
| Banco / Cache | PostgreSQL 16 + Redis 7                       |
| Frontend      | SvelteKit 2 + TanStack Query + Tailwind CSS 4 |
| Proxy         | Caddy (SSL automático via Let's Encrypt)      |
| Runtime       | Node.js 22 + pnpm 10 (via corepack)           |

Estrutura: `backend/` (API) e `frontend/` (SvelteKit), orquestrados por Docker Compose. Sem workspace — cada pasta é um projeto pnpm independente; a raiz tem scripts de orquestração.

## Pré-requisitos

- Node.js 22 (nvm/fnm: `nvm install` — usa o `.nvmrc`)
- pnpm 10 (`corepack enable && corepack prepare pnpm@10.33.4 --activate`)
- Docker + Docker Compose (para PostgreSQL, Redis e produção)

## Primeira vez

```bash
pnpm install          # raiz: orquestração (concurrently, lefthook)
pnpm --dir backend install
pnpm --dir frontend install
cp backend/.env.example backend/.env   # ajuste os secrets
```

## Desenvolvimento

O compose de dev sobe **PostgreSQL + Redis + API** (com hot reload via `tsx watch`). O frontend roda no host com proxy para a API.

```bash
# Terminal 1 — infra + API (hot reload em src/)
cd backend && make dev

# Terminal 2 — frontend (http://localhost:5173, proxy /api → :3000)
cd frontend && pnpm dev
```

- **API:** http://localhost:3000 — Swagger em `/docs`
- **Frontend:** http://localhost:5173
- **Hot reload:** basta o `make dev` para infra; o frontend recarrega sozinho
- **Migrations:** rodam automaticamente no entrypoint da API — nada a fazer

Alternativa com tudo no host (só infra em containers):

```bash
docker compose -f backend/docker-compose.dev.yml up -d postgres redis
pnpm dev   # raiz: backend (:3000) + frontend (:5173)
```

### Comandos de dev (em `backend/`)

| Comando            | O que faz                                   |
| ------------------ | ------------------------------------------- |
| `make dev`         | Sobe infra + API com hot reload             |
| `make dev-logs`    | Logs em tempo real                          |
| `make dev-down`    | Para os containers (dados persistem)        |
| `make dev-reset`   | Recria tudo do zero (**apaga o banco dev**) |
| `make db-migrate`  | Roda migrations no container                |
| `make db-push`     | Push do schema direto (dev apenas)          |
| `make db-generate` | Gera migration a partir do schema           |
| `make help`        | Lista todos os targets                      |

Seed opcional (dados de exemplo):

```bash
cd backend && pnpm db:seed
```

### Validação e testes

```bash
pnpm validate        # raiz: typecheck + lint + format:check (backend e frontend)
pnpm --dir backend test
```

Os hooks do lefthook (instalados no primeiro `pnpm install`) rodam lint/format nos arquivos staged e validam o formato conventional commits em português (ex.: `feat: adiciona tela de login`).

## Produção

Stack completa em containers: PostgreSQL + Redis + API + Frontend. O proxy reverso é o **Caddy** rodando no host (portas 80/443, SSL automático) — ele roteia `/api`, `/socket.io` e `/uploads` para a API e o resto para o frontend. O frontend usa URLs relativas, então não há env vars de URL no build.

```bash
cd backend
cp .env.example .env           # gere secrets: openssl rand -hex 32 (JWT_SECRET, JWT_REFRESH_SECRET)
make prod                      # ou: docker compose up --build -d  (sem nginx — o Caddy é o proxy)
```

- **Caddyfile:** bloco `desafia.fun` com `handle /api/*`, `/socket.io/*`, `/uploads/*` → porta da API e `handle` → porta do frontend. As portas publicadas no host (API `3100`, frontend `3001`) são definidas no `ports:` do compose — ajuste o Caddyfile junto se mudarem. Modelo completo em [DEPLOY.md](DEPLOY.md).
- **Rodar produção localmente:** `docker compose up -d postgres redis app frontend` — API em `:3100` (teste direto) e frontend em `:3001` (sem proxy, use a API em `:3100` ou o fluxo dev).
- **Migrations:** rodam sozinhas no entrypoint antes de a API iniciar.
- **Comandos:** `make prod-logs`, `make prod-down`, `make prod-reset` (**apaga banco e uploads**), `make build`.

### Atualizar produção

```bash
cd /opt/desafia
git pull
cd backend && make prod
```

Só o que mudou é rebuildado (o Dockerfile do frontend usa cópia seletiva — o cache de dependências sobrevive).

## Estrutura de referência

Docs da fonte da verdade: `docs/business/doc-visao.md` (requisitos e regras de negócio) e `docs/superpowers/specs/2026-06-20-quiz-platform-design.md` (arquitetura e protocolo). Convenções de código e restrições: `AGENTS.md`.
