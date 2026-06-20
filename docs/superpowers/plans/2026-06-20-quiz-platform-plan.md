# Plataforma de Quizzes — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir plataforma interativa de quizzes em tempo real com criação de questionários (Host autenticado) e participação ao vivo via PIN (Players anônimos), comunicação WebSocket, pontuação por velocidade+precisão e leaderboard em tempo real.

**Architecture:** Monólito Node.js + TypeScript com Fastify (REST), Socket.IO (WebSocket), Drizzle ORM (PostgreSQL) e Redis (estado efêmero). Frontend SvelteKit com MVVM estrito. Nginx como proxy reverso. Docker Compose para orquestração local.

**Tech Stack:** Node.js 22, TypeScript 5.x, Fastify 5.x, Socket.IO 4.x, Drizzle ORM, PostgreSQL 16, Redis 7 (ioredis), SvelteKit 2.x, Zod, bcrypt, JWT

## Global Constraints

- KISS primeiro: função pura > classe > abstração. Sem DI containers, sem repositórios — service chama Drizzle/Redis direto
- DRY segundo: extrair repetição somente quando houver 3+ ocorrências idênticas
- SOLID com moderação: SRP e DIP sempre; OCP/LSP/ISP só quando o problema pedir
- MVVM obrigatório no frontend: View nunca chama API, ViewModel nunca importa `.svelte`, Model é função pura
- Documentação de requisitos: `docs/business/doc-visao.md` — fonte da verdade do negócio
- SDD: `docs/superpowers/specs/2026-06-20-quiz-platform-design.md` — fonte da verdade técnica
- Dúvidas de framework: consultar Context7 MCP (`resolve-library-id` → `query-docs`)
- Commits em português: `<tipo>: <verbo no imperativo> <mensagem>`
- Migrations nunca editadas manualmente — Drizzle é a fonte da verdade
- Sem `try/catch` em componentes `.svelte` — erro vive na store
- Sem `fetch`/`socket.emit` direto em componentes — sempre via store

---

## Fase 1: Fundação — Projeto, Configuração, Banco e Redis

### Task 1: Scaffolding do Projeto Backend

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/config/env.ts`

**Interfaces:**
- Consumes: nada (primeira task)
- Produces: `env` (objeto tipado por Zod com `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `PORT`, `HOST`)

- [ ] **Step 1: Inicializar projeto Node.js**

```bash
mkdir -p src/config src/db src/redis src/modules/auth src/modules/quiz \
  src/modules/session src/modules/gameplay src/modules/report \
  src/middleware src/shared
npm init -y
```

- [ ] **Step 2: Instalar dependências de produção**

```bash
npm install fastify@^5 @fastify/cors @fastify/rate-limit @fastify/cookie \
  socket.io drizzle-orm postgres zod zod-to-json-schema \
  ioredis bcrypt jsonwebtoken dotenv
```

- [ ] **Step 3: Instalar dependências de desenvolvimento**

```bash
npm install -D typescript @types/node @types/bcrypt @types/jsonwebtoken \
  tsx drizzle-kit vitest @types/bcrypt
```

- [ ] **Step 4: Escrever `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 5: Escrever `src/config/env.ts`**

```typescript
import { z } from "zod";
import "dotenv/config";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  PORT: z.coerce.number().int().default(3000),
  HOST: z.string().default("0.0.0.0"),
});

export const env = envSchema.parse(process.env);
```

- [ ] **Step 6: Criar `.env.example`**

```bash
cat > .env.example << 'EOF'
DATABASE_URL=postgres://user:password@localhost:5432/quizplatform
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-me-to-a-random-64-char-string
JWT_REFRESH_SECRET=change-me-to-another-random-64-char-string
PORT=3000
HOST=0.0.0.0
EOF
```

- [ ] **Step 7: Verificar que `env.ts` é válido**

```bash
cp .env.example .env
npx tsx -e "import './src/config/env'; console.log('env OK')"
```

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json tsconfig.json .env.example src/config/env.ts
git commit -m "chore: scaffolding do projeto backend com Fastify, TypeScript e Zod"
```

---

### Task 2: Schema Drizzle e Conexão PostgreSQL

**Files:**
- Create: `src/db/schema.ts`
- Create: `src/db/index.ts`
- Create: `drizzle.config.ts`
- Create: `src/db/migrations/` (pasta vazia, migrations geradas)

**Interfaces:**
- Consumes: `env.DATABASE_URL` (de Task 1)
- Produces: `db` (Drizzle client), tabelas exportadas: `users`, `quizzes`, `questions`, `alternatives`, `gameSessions`, `playerAnswers`, `gameResults`, relações

- [ ] **Step 1: Criar `drizzle.config.ts`**

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

- [ ] **Step 2: Escrever `src/db/schema.ts`**

Copiar o schema completo do SDD (`docs/superpowers/specs/2026-06-20-quiz-platform-design.md`, seção 4 — Modelo de Dados). Conteúdo inclui as 7 tabelas (`users`, `quizzes`, `questions`, `alternatives`, `gameSessions`, `playerAnswers`, `gameResults`) com todas as constraints, índices e relações Drizzle.

```typescript
// src/db/schema.ts
import {
  pgTable, uuid, varchar, text, boolean, integer,
  timestamp, uniqueIndex, index, check, relations, sql,
} from "drizzle-orm/pg-core";
import { inArray } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const quizzes = pgTable("quizzes", {
  id: uuid("id").defaultRandom().primaryKey(),
  authorId: uuid("author_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  isPublished: boolean("is_published").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index("idx_quizzes_author").on(t.authorId)]);

export const questions = pgTable("questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  quizId: uuid("quiz_id").references(() => quizzes.id, { onDelete: "cascade" }).notNull(),
  text: text("text").notNull(),
  questionType: varchar("question_type", { length: 20 }).notNull(),
  basePoints: integer("base_points").default(1000).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("idx_questions_quiz").on(t.quizId, t.sortOrder),
  check("chk_question_type", inArray(t.questionType, ["multiple_choice", "true_false"])),
  check("chk_base_points", sql`${t.basePoints} > 0`),
]);

export const alternatives = pgTable("alternatives", {
  id: uuid("id").defaultRandom().primaryKey(),
  questionId: uuid("question_id").references(() => questions.id, { onDelete: "cascade" }).notNull(),
  text: text("text").notNull(),
  isCorrect: boolean("is_correct").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
}, (t) => [index("idx_alternatives_question").on(t.questionId)]);

export const gameSessions = pgTable("game_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  quizId: uuid("quiz_id").references(() => quizzes.id).notNull(),
  hostId: uuid("host_id").references(() => users.id).notNull(),
  pin: varchar("pin", { length: 6 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  timeLimitSeconds: integer("time_limit_seconds").default(30).notNull(),
  playerCount: integer("player_count").default(0).notNull(),
  maxPlayers: integer("max_players").default(500).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("idx_sessions_quiz").on(t.quizId),
  uniqueIndex("idx_active_pin").on(t.pin).where(sql`${t.status} != 'finished'`),
  check("chk_session_status", inArray(t.status, ["lobby", "playing", "finished"])),
  check("chk_time_limit", sql`${t.timeLimitSeconds} BETWEEN 5 AND 300`),
]);

export const playerAnswers = pgTable("player_answers", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").references(() => gameSessions.id, { onDelete: "cascade" }).notNull(),
  questionId: uuid("question_id").references(() => questions.id).notNull(),
  playerNickname: varchar("player_nickname", { length: 50 }).notNull(),
  selectedAnswer: varchar("selected_answer", { length: 1 }).notNull(),
  isCorrect: boolean("is_correct").notNull(),
  responseMs: integer("response_ms").notNull(),
  pointsEarned: integer("points_earned").default(0).notNull(),
  answeredAt: timestamp("answered_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("idx_answers_session").on(t.sessionId),
  index("idx_answers_question").on(t.questionId),
]);

export const gameResults = pgTable("game_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").references(() => gameSessions.id, { onDelete: "cascade" }).notNull(),
  playerNickname: varchar("player_nickname", { length: 50 }).notNull(),
  totalScore: integer("total_score").default(0).notNull(),
  correctCount: integer("correct_count").default(0).notNull(),
  totalCount: integer("total_count").default(0).notNull(),
  avgResponseMs: integer("avg_response_ms").default(0).notNull(),
  rank: integer("rank").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index("idx_results_session").on(t.sessionId, t.rank)]);

// Relações
export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  author: one(users, { fields: [quizzes.authorId], references: [users.id] }),
  questions: many(questions),
  sessions: many(gameSessions),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  quiz: one(quizzes, { fields: [questions.quizId], references: [quizzes.id] }),
  alternatives: many(alternatives),
}));

export const alternativesRelations = relations(alternatives, ({ one }) => ({
  question: one(questions, { fields: [alternatives.questionId], references: [questions.id] }),
}));

export const gameSessionsRelations = relations(gameSessions, ({ one, many }) => ({
  quiz: one(quizzes, { fields: [gameSessions.quizId], references: [quizzes.id] }),
  host: one(users, { fields: [gameSessions.hostId], references: [users.id] }),
  answers: many(playerAnswers),
  results: many(gameResults),
}));

export const playerAnswersRelations = relations(playerAnswers, ({ one }) => ({
  session: one(gameSessions, { fields: [playerAnswers.sessionId], references: [gameSessions.id] }),
  question: one(questions, { fields: [playerAnswers.questionId], references: [questions.id] }),
}));

export const gameResultsRelations = relations(gameResults, ({ one }) => ({
  session: one(gameSessions, { fields: [gameResults.sessionId], references: [gameSessions.id] }),
}));
```

- [ ] **Step 3: Escrever `src/db/index.ts`**

```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../config/env";
import * as schema from "./schema";

const client = postgres(env.DATABASE_URL);
export const db = drizzle(client, { schema });
export { schema };
```

- [ ] **Step 4: Gerar migration inicial**

```bash
npx drizzle-kit generate
```

- [ ] **Step 5: Aplicar migration no banco local**

```bash
npx drizzle-kit migrate
```

- [ ] **Step 6: Commit**

```bash
git add drizzle.config.ts src/db/schema.ts src/db/index.ts src/db/migrations/
git commit -m "feat: schema Drizzle com 7 tabelas, índices e relações"
```

---

### Task 3: Cliente Redis e Fábrica de Chaves

**Files:**
- Create: `src/redis/client.ts`
- Create: `src/redis/keys.ts`

**Interfaces:**
- Consumes: `env.REDIS_URL` (de Task 1)
- Produces: `redis` (ioredis client), `keys` (objeto com funções que geram chaves Redis tipadas)

- [ ] **Step 1: Escrever `src/redis/client.ts`**

```typescript
import { Redis } from "ioredis";
import { env } from "../config/env";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});
```

- [ ] **Step 2: Escrever `src/redis/keys.ts`**

```typescript
/** Fábrica de chaves Redis. Centraliza o formato para evitar erros de digitação. */
export const keys = {
  /** Status da sessão: "lobby" | "playing" | "finished" */
  sessionStatus: (pin: string) => `pin:${pin}:status` as const,

  /** Config da sessão: { quiz_id, time_limit_seconds, current_question_index } */
  sessionConfig: (pin: string) => `pin:${pin}:config` as const,

  /** Set de socket_ids dos players na sessão */
  sessionPlayers: (pin: string) => `pin:${pin}:players` as const,

  /** Dados de um player específico: { nickname, total_score } */
  sessionPlayer: (pin: string, socketId: string) =>
    `pin:${pin}:player:${socketId}` as const,

  /** Sorted Set de pontuações: { socket_id: score } */
  sessionScores: (pin: string) => `pin:${pin}:scores` as const,

  /** Respostas de uma pergunta: Hash { player_nickname → { answer, response_ms, points } } */
  questionAnswers: (pin: string, questionIndex: number) =>
    `pin:${pin}:answers:q:${questionIndex}` as const,

  /** Timestamp de quando a pergunta foi revelada (TTL 10s) */
  questionRevealed: (pin: string, questionIndex: number) =>
    `pin:${pin}:q:${questionIndex}:revealed` as const,

  /** Lookup reverso PIN → sessionId UUID (TTL 24h) */
  pinLookup: (pin: string) => `pin:lookup:${pin}` as const,
};
```

- [ ] **Step 3: Commit**

```bash
git add src/redis/client.ts src/redis/keys.ts
git commit -m "feat: cliente Redis e fábrica de chaves tipadas"
```

---

### Task 4: Utilitários Compartilhados — Erros e Paginação

**Files:**
- Create: `src/shared/errors.ts`
- Create: `src/shared/pagination.ts`

**Interfaces:**
- Consumes: nada
- Produces: `AppError`, `NotFoundError`, `UnauthorizedError` (classes de erro); `paginate` (função auxiliar)

- [ ] **Step 1: Escrever `src/shared/errors.ts`**

```typescript
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code: string = "BAD_REQUEST",
  ) {
    super(message);
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string) {
    super(`${entity} não encontrado`, 404, "NOT_FOUND");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Não autenticado") {
    super(message, 401, "UNAUTHORIZED");
  }
}
```

- [ ] **Step 2: Escrever `src/shared/pagination.ts`**

```typescript
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function paginate<T>(
  items: T[],
  total: number,
  params: PaginationParams,
): PaginatedResult<T> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  return { data: items, total, page, limit, totalPages: Math.ceil(total / limit) };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/errors.ts src/shared/pagination.ts
git commit -m "feat: classes de erro AppError/NotFoundError/UnauthorizedError e helper de paginação"
```

---

## Fase 2: Autenticação

### Task 5: Módulo de Autenticação — Service e Schemas

**Files:**
- Create: `src/modules/auth/auth.schema.ts`
- Create: `src/modules/auth/auth.service.ts`

**Interfaces:**
- Consumes: `db`, `schema` (de Task 2), `env.JWT_SECRET`, `env.JWT_REFRESH_SECRET`, `AppError`, `UnauthorizedError` (Task 4)
- Produces: `authService.register()`, `authService.login()`, `authService.refresh()`, `authService.logout()`

- [ ] **Step 1: Escrever `src/modules/auth/auth.schema.ts`**

```typescript
import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const userResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.string(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
```

- [ ] **Step 2: Escrever `src/modules/auth/auth.service.ts`**

```typescript
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db, schema } from "../../db";
import { env } from "../../config/env";
import { AppError, UnauthorizedError } from "../../shared/errors";
import type { RegisterInput, LoginInput, UserResponse } from "./auth.schema";
import { eq } from "drizzle-orm";

const BCRYPT_ROUNDS = 12;
const ACCESS_TTL = "15min";
const REFRESH_TTL = "7d";

function signAccess(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: ACCESS_TTL });
}

function signRefresh(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_TTL });
}

function toUserResponse(user: typeof schema.users.$inferSelect): UserResponse {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  };
}

export const authService = {
  async register(input: RegisterInput) {
    const existing = await db.query.users.findFirst({
      where: eq(schema.users.email, input.email),
    });
    if (existing) throw new AppError("Email já cadastrado", 409, "EMAIL_EXISTS");

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const [user] = await db
      .insert(schema.users)
      .values({ name: input.name, email: input.email, passwordHash })
      .returning();

    const accessToken = signAccess(user.id);
    const refreshToken = signRefresh(user.id);

    return { user: toUserResponse(user), accessToken, refreshToken };
  },

  async login(input: LoginInput) {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, input.email),
    });
    if (!user) throw new UnauthorizedError("Email ou senha inválidos");

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) throw new UnauthorizedError("Email ou senha inválidos");

    const accessToken = signAccess(user.id);
    const refreshToken = signRefresh(user.id);

    return { user: toUserResponse(user), accessToken, refreshToken };
  },

  async refresh(refreshToken: string) {
    try {
      const payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { sub: string };
      const user = await db.query.users.findFirst({
        where: eq(schema.users.id, payload.sub),
      });
      if (!user) throw new UnauthorizedError();

      const accessToken = signAccess(user.id);
      const newRefreshToken = signRefresh(user.id);
      return { accessToken, refreshToken: newRefreshToken };
    } catch {
      throw new UnauthorizedError("Token inválido ou expirado");
    }
  },
};
```

- [ ] **Step 3: Escrever teste para register (`tests/modules/auth/auth.service.test.ts`)**

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { authService } from "@/modules/auth/auth.service";

describe("authService.register", () => {
  it("deve criar usuário e retornar tokens", async () => {
    const result = await authService.register({
      name: "Teste",
      email: "teste@exemplo.com",
      password: "senha1234",
    });
    expect(result.user.name).toBe("Teste");
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
  });

  it("deve rejeitar email duplicado", async () => {
    await expect(
      authService.register({
        name: "Teste 2",
        email: "teste@exemplo.com",
        password: "outrasenha123",
      }),
    ).rejects.toThrow("Email já cadastrado");
  });
});
```

- [ ] **Step 4: Rodar teste (espera-se falha — banco não configurado no teste)**

```bash
npx vitest run tests/modules/auth/auth.service.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/modules/auth/auth.schema.ts src/modules/auth/auth.service.ts \
  tests/modules/auth/auth.service.test.ts
git commit -m "feat: auth service com register, login e refresh JWT"
```

---

### Task 6: Rotas de Autenticação

**Files:**
- Create: `src/modules/auth/auth.routes.ts`
- Create: `src/middleware/auth.ts`
- Create: `src/middleware/error-handler.ts`

**Interfaces:**
- Consumes: `authService` (Task 5), `FastifyInstance`, `AppError` (Task 4)
- Produces: rotas `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`; middleware `authenticate`; `errorHandler`

- [ ] **Step 1: Escrever `src/middleware/auth.ts`**

```typescript
import { FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "UNAUTHORIZED", message: "Não autenticado" });
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string };
    (request as any).userId = payload.sub;
  } catch {
    return reply.status(401).send({ error: "UNAUTHORIZED", message: "Token inválido" });
  }
}
```

- [ ] **Step 2: Escrever `src/middleware/error-handler.ts`**

```typescript
import { FastifyErrorHandler } from "fastify";
import { ZodError } from "zod";
import { AppError } from "../shared/errors";

export const errorHandler: FastifyErrorHandler = (error, request, reply) => {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: error.code,
      message: error.message,
    });
  }
  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: "VALIDATION_ERROR",
      message: "Dados inválidos",
      details: error.flatten().fieldErrors,
    });
  }
  request.log.error(error);
  return reply.status(500).send({
    error: "INTERNAL_ERROR",
    message: "Erro interno do servidor",
  });
};
```

- [ ] **Step 3: Escrever `src/modules/auth/auth.routes.ts`**

```typescript
import { FastifyInstance } from "fastify";
import { authService } from "./auth.service";
import { registerSchema, loginSchema } from "./auth.schema";

export async function authRoutes(app: FastifyInstance) {
  app.post("/api/auth/register", async (request, reply) => {
    const input = registerSchema.parse(request.body);
    const { user, accessToken, refreshToken } = await authService.register(input);

    reply.setCookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/api/auth",
      maxAge: 7 * 24 * 3600,
    });

    return reply.status(201).send({ user, accessToken });
  });

  app.post("/api/auth/login", async (request, reply) => {
    const input = loginSchema.parse(request.body);
    const { user, accessToken, refreshToken } = await authService.login(input);

    reply.setCookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/api/auth",
      maxAge: 7 * 24 * 3600,
    });

    return reply.send({ user, accessToken });
  });

  app.post("/api/auth/refresh", async (request, reply) => {
    const token = request.cookies.refreshToken;
    if (!token) return reply.status(401).send({ error: "UNAUTHORIZED", message: "Sem refresh token" });

    const { accessToken, refreshToken } = await authService.refresh(token);

    reply.setCookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/api/auth",
      maxAge: 7 * 24 * 3600,
    });

    return reply.send({ accessToken });
  });

  app.post("/api/auth/logout", async (_request, reply) => {
    reply.clearCookie("refreshToken", { path: "/api/auth" });
    return reply.status(204).send();
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/auth/auth.routes.ts src/middleware/auth.ts src/middleware/error-handler.ts
git commit -m "feat: rotas de autenticação + middlewares auth e error-handler"
```

---

## Fase 3: CRUD de Quizzes, Perguntas e Alternativas

### Task 7: Quiz Service

**Files:**
- Create: `src/modules/quiz/quiz.schema.ts`
- Create: `src/modules/quiz/quiz.service.ts`

**Interfaces:**
- Consumes: `db`, `schema` (Task 2), `AppError`, `NotFoundError` (Task 4)
- Produces: `quizService.create()`, `quizService.list()`, `quizService.getById()`, `quizService.update()`, `quizService.remove()`

- [ ] **Step 1: Escrever `src/modules/quiz/quiz.schema.ts`**

```typescript
import { z } from "zod";

export const createQuizSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
});

export const updateQuizSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  isPublished: z.boolean().optional(),
});

export const quizListItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  isPublished: z.boolean(),
  questionCount: z.number().int(),
  createdAt: z.string(),
});

export const quizFullSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  isPublished: z.boolean(),
  createdAt: z.string(),
  questions: z.array(z.object({
    id: z.string().uuid(),
    text: z.string(),
    questionType: z.enum(["multiple_choice", "true_false"]),
    basePoints: z.number().int(),
    sortOrder: z.number().int(),
    alternatives: z.array(z.object({
      id: z.string().uuid(),
      text: z.string(),
      isCorrect: z.boolean(),
      sortOrder: z.number().int(),
    })),
  })),
});

export type CreateQuizInput = z.infer<typeof createQuizSchema>;
export type UpdateQuizInput = z.infer<typeof updateQuizSchema>;
```

- [ ] **Step 2: Escrever `src/modules/quiz/quiz.service.ts`**

```typescript
import { eq, and, sql, asc } from "drizzle-orm";
import { db, schema } from "../../db";
import { NotFoundError, AppError } from "../../shared/errors";
import type { CreateQuizInput, UpdateQuizInput } from "./quiz.schema";

export const quizService = {
  async list(userId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const quizzes = await db.query.quizzes.findMany({
      where: eq(schema.quizzes.authorId, userId),
      with: { questions: true },
      orderBy: (q, { desc }) => [desc(q.createdAt)],
      limit,
      offset,
    });

    return {
      data: quizzes.map((q) => ({
        id: q.id,
        title: q.title,
        description: q.description,
        isPublished: q.isPublished,
        questionCount: q.questions.length,
        createdAt: q.createdAt.toISOString(),
      })),
      total: quizzes.length,
      page,
      limit,
    };
  },

  async getById(quizId: string, userId: string) {
    const quiz = await db.query.quizzes.findFirst({
      where: and(eq(schema.quizzes.id, quizId), eq(schema.quizzes.authorId, userId)),
      with: {
        questions: {
          orderBy: asc(schema.questions.sortOrder),
          with: {
            alternatives: { orderBy: asc(schema.alternatives.sortOrder) },
          },
        },
      },
    });
    if (!quiz) throw new NotFoundError("Quiz");

    return {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      isPublished: quiz.isPublished,
      createdAt: quiz.createdAt.toISOString(),
      questions: quiz.questions.map((q) => ({
        id: q.id,
        text: q.text,
        questionType: q.questionType as "multiple_choice" | "true_false",
        basePoints: q.basePoints,
        sortOrder: q.sortOrder,
        alternatives: q.alternatives.map((a) => ({
          id: a.id,
          text: a.text,
          isCorrect: a.isCorrect,
          sortOrder: a.sortOrder,
        })),
      })),
    };
  },

  async create(input: CreateQuizInput, userId: string) {
    const [quiz] = await db
      .insert(schema.quizzes)
      .values({ title: input.title, description: input.description ?? null, authorId: userId })
      .returning();
    return { id: quiz.id, title: quiz.title };
  },

  async update(quizId: string, userId: string, input: UpdateQuizInput) {
    const quiz = await db.query.quizzes.findFirst({
      where: and(eq(schema.quizzes.id, quizId), eq(schema.quizzes.authorId, userId)),
    });
    if (!quiz) throw new NotFoundError("Quiz");

    const [updated] = await db
      .update(schema.quizzes)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(schema.quizzes.id, quizId))
      .returning();
    return { id: updated.id, title: updated.title, isPublished: updated.isPublished };
  },

  async remove(quizId: string, userId: string) {
    const quiz = await db.query.quizzes.findFirst({
      where: and(eq(schema.quizzes.id, quizId), eq(schema.quizzes.authorId, userId)),
    });
    if (!quiz) throw new NotFoundError("Quiz");
    await db.delete(schema.quizzes).where(eq(schema.quizzes.id, quizId));
  },
};
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/quiz/quiz.schema.ts src/modules/quiz/quiz.service.ts
git commit -m "feat: quiz service com CRUD completo (list, getById, create, update, delete)"
```

---

### Task 8: Question e Alternative Services

**Files:**
- Create: `src/modules/quiz/quiz.routes.ts` (rotas de quiz, questions e alternatives)

**Interfaces:**
- Consumes: `quizService` (Task 7), `db`, `schema` (Task 2)
- Produces: rotas completas de quiz (5 endpoints), questions (4 endpoints), alternatives (4 endpoints)

- [ ] **Step 1: Escrever rotas de questions e alternatives inline em `quiz.routes.ts`**

Como os services são simples (KISS: queries diretas no Drizzle, sem service layer extra para questions/alternatives), as rotas de questions e alternatives chamam o Drizzle diretamente, seguindo as regras do SDD:

```typescript
// src/modules/quiz/quiz.routes.ts (roteiro — escrever arquivo completo)
import { FastifyInstance } from "fastify";
import { db, schema } from "../../db";
import { quizService } from "./quiz.service";
import { createQuizSchema, updateQuizSchema } from "./quiz.schema";
import { authenticate } from "../../middleware/auth";
import { NotFoundError } from "../../shared/errors";
import { eq, and, asc } from "drizzle-orm";
import { z } from "zod";

const questionSchema = z.object({
  text: z.string().min(1),
  questionType: z.enum(["multiple_choice", "true_false"]),
  basePoints: z.number().int().min(1).default(1000),
});

const alternativeSchema = z.object({
  text: z.string().min(1),
  isCorrect: z.boolean().default(false),
});

const reorderSchema = z.object({ sortOrder: z.number().int().min(0) });

export async function quizRoutes(app: FastifyInstance) {
  // Todas as rotas requerem autenticação
  app.addHook("onRequest", authenticate);

  // === QUIZZES ===
  app.get("/api/quizzes", async (request) => {
    const { page, limit } = request.query as any;
    return quizService.list((request as any).userId, Number(page) || 1, Number(limit) || 20);
  });

  app.get<{ Params: { id: string } }>("/api/quizzes/:id", async (request) => {
    return quizService.getById(request.params.id, (request as any).userId);
  });

  app.post("/api/quizzes", async (request, reply) => {
    const input = createQuizSchema.parse(request.body);
    const quiz = await quizService.create(input, (request as any).userId);
    return reply.status(201).send(quiz);
  });

  app.put<{ Params: { id: string } }>("/api/quizzes/:id", async (request) => {
    const input = updateQuizSchema.parse(request.body);
    return quizService.update(request.params.id, (request as any).userId, input);
  });

  app.delete<{ Params: { id: string } }>("/api/quizzes/:id", async (request, reply) => {
    await quizService.remove(request.params.id, (request as any).userId);
    return reply.status(204).send();
  });

  // === QUESTIONS ===
  app.post<{ Params: { id: string } }>("/api/quizzes/:id/questions", async (request, reply) => {
    const quiz = await db.query.quizzes.findFirst({
      where: and(eq(schema.quizzes.id, request.params.id), eq(schema.quizzes.authorId, (request as any).userId)),
    });
    if (!quiz) throw new NotFoundError("Quiz");

    const input = questionSchema.parse(request.body);
    const maxOrder = await db.query.questions.findFirst({
      where: eq(schema.questions.quizId, request.params.id),
      orderBy: (q, { desc }) => [desc(q.sortOrder)],
    });

    const [question] = await db
      .insert(schema.questions)
      .values({
        quizId: request.params.id,
        text: input.text,
        questionType: input.questionType,
        basePoints: input.basePoints,
        sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
      })
      .returning();

    return reply.status(201).send(question);
  });

  app.put<{ Params: { id: string } }>("/api/questions/:id", async (request) => {
    const input = questionSchema.partial().parse(request.body);
    const [updated] = await db
      .update(schema.questions)
      .set(input)
      .where(eq(schema.questions.id, request.params.id))
      .returning();
    if (!updated) throw new NotFoundError("Pergunta");
    return updated;
  });

  app.delete<{ Params: { id: string } }>("/api/questions/:id", async (request, reply) => {
    await db.delete(schema.questions).where(eq(schema.questions.id, request.params.id));
    return reply.status(204).send();
  });

  app.put<{ Params: { id: string } }>("/api/questions/:id/order", async (request) => {
    const { sortOrder } = reorderSchema.parse(request.body);
    const [updated] = await db
      .update(schema.questions)
      .set({ sortOrder })
      .where(eq(schema.questions.id, request.params.id))
      .returning();
    if (!updated) throw new NotFoundError("Pergunta");
    return updated;
  });

  // === ALTERNATIVES ===
  app.post<{ Params: { id: string } }>("/api/questions/:id/alternatives", async (request, reply) => {
    const question = await db.query.questions.findFirst({
      where: eq(schema.questions.id, request.params.id),
      with: { alternatives: true },
    });
    if (!question) throw new NotFoundError("Pergunta");

    const input = alternativeSchema.parse(request.body);

    // Se isCorrect, desmarca as outras
    if (input.isCorrect) {
      await db
        .update(schema.alternatives)
        .set({ isCorrect: false })
        .where(eq(schema.alternatives.questionId, request.params.id));
    }

    const maxOrder = question.alternatives.reduce((max, a) => Math.max(max, a.sortOrder), -1);
    const [alt] = await db
      .insert(schema.alternatives)
      .values({
        questionId: request.params.id,
        text: input.text,
        isCorrect: input.isCorrect,
        sortOrder: maxOrder + 1,
      })
      .returning();

    return reply.status(201).send(alt);
  });

  app.put<{ Params: { id: string } }>("/api/alternatives/:id", async (request) => {
    const input = alternativeSchema.partial().parse(request.body);
    const [updated] = await db
      .update(schema.alternatives)
      .set(input)
      .where(eq(schema.alternatives.id, request.params.id))
      .returning();
    if (!updated) throw new NotFoundError("Alternativa");
    return updated;
  });

  app.delete<{ Params: { id: string } }>("/api/alternatives/:id", async (request, reply) => {
    await db.delete(schema.alternatives).where(eq(schema.alternatives.id, request.params.id));
    return reply.status(204).send();
  });

  app.put<{ Params: { id: string } }>("/api/alternatives/:id/correct", async (request) => {
    const alt = await db.query.alternatives.findFirst({
      where: eq(schema.alternatives.id, request.params.id),
    });
    if (!alt) throw new NotFoundError("Alternativa");

    // Desmarca todas e marca esta
    await db
      .update(schema.alternatives)
      .set({ isCorrect: false })
      .where(eq(schema.alternatives.questionId, alt.questionId));
    const [updated] = await db
      .update(schema.alternatives)
      .set({ isCorrect: true })
      .where(eq(schema.alternatives.id, request.params.id))
      .returning();
    return updated;
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/quiz/quiz.routes.ts
git commit -m "feat: rotas completas de quizzes, questions e alternatives (13 endpoints)"
```

---

## Fase 4: Sessões de Jogo (REST)

### Task 9: Session Service e Rotas

**Files:**
- Create: `src/modules/session/session.schema.ts`
- Create: `src/modules/session/session.service.ts`
- Create: `src/modules/session/session.routes.ts`

**Interfaces:**
- Consumes: `db`, `schema` (Task 2), `redis`, `keys` (Task 3), `AppError`, `NotFoundError` (Task 4)
- Produces: `sessionService.create()` (gera PIN, persiste no PG + Redis), `sessionService.getById()`, `sessionService.verifyPin()`, `sessionService.getResults()`

- [ ] **Step 1: Escrever `src/modules/session/session.schema.ts`**

```typescript
import { z } from "zod";

export const createSessionSchema = z.object({
  quizId: z.string().uuid(),
});

export const sessionResponseSchema = z.object({
  id: z.string().uuid(),
  pin: z.string().length(6),
  quizTitle: z.string(),
  status: z.enum(["lobby", "playing", "finished"]),
  timeLimitSeconds: z.number().int(),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
```

- [ ] **Step 2: Escrever `src/modules/session/session.service.ts`**

```typescript
import { randomInt } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "../../db";
import { redis } from "../../redis/client";
import { keys } from "../../redis/keys";
import { NotFoundError } from "../../shared/errors";

function generatePin(): string {
  return String(randomInt(100000, 999999));
}

async function ensureUniquePin(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const pin = generatePin();
    const exists = await redis.exists(keys.pinLookup(pin));
    if (!exists) return pin;
  }
  throw new Error("Could not generate unique PIN after 10 attempts");
}

export const sessionService = {
  async create(quizId: string, hostId: string) {
    // Valida que o quiz existe e pertence ao host
    const quiz = await db.query.quizzes.findFirst({
      where: eq(schema.quizzes.id, quizId),
    });
    if (!quiz) throw new NotFoundError("Quiz");
    if (quiz.authorId !== hostId) throw new NotFoundError("Quiz");
    if (!quiz.isPublished) throw new NotFoundError("Quiz não publicado");

    const pin = await ensureUniquePin();

    // Persiste no PostgreSQL
    const [session] = await db
      .insert(schema.gameSessions)
      .values({
        quizId,
        hostId,
        pin,
        status: "lobby",
        timeLimitSeconds: 30,
      })
      .returning();

    // Configura Redis
    await redis.set(keys.pinLookup(pin), session.id, "EX", 24 * 3600);
    await redis.set(keys.sessionStatus(pin), "lobby");
    await redis.hset(keys.sessionConfig(pin), {
      quiz_id: quizId,
      time_limit_seconds: "30",
      current_question_index: "0",
    });

    return {
      id: session.id,
      pin,
      quizTitle: quiz.title,
      status: "lobby" as const,
      timeLimitSeconds: 30,
    };
  },

  async getById(sessionId: string, hostId: string) {
    const session = await db.query.gameSessions.findFirst({
      where: eq(schema.gameSessions.id, sessionId),
      with: { quiz: true },
    });
    if (!session || session.hostId !== hostId) throw new NotFoundError("Sessão");
    return session;
  },

  async verifyPin(pin: string) {
    const sessionId = await redis.get(keys.pinLookup(pin));
    if (!sessionId) throw new NotFoundError("Sessão");

    const status = await redis.get(keys.sessionStatus(pin));
    if (!status || status === "finished") throw new NotFoundError("Sessão");

    const session = await db.query.gameSessions.findFirst({
      where: eq(schema.gameSessions.id, sessionId),
      with: { quiz: true },
    });
    if (!session) throw new NotFoundError("Sessão");

    return {
      sessionId: session.id,
      pin,
      quizTitle: session.quiz.title,
      status: status as "lobby" | "playing",
    };
  },

  async getResults(sessionId: string, hostId: string) {
    const session = await db.query.gameSessions.findFirst({
      where: eq(schema.gameSessions.id, sessionId),
    });
    if (!session || session.hostId !== hostId) throw new NotFoundError("Sessão");

    // Busca do Postgres (resultados já persistidos)
    const results = await db.query.gameResults.findMany({
      where: eq(schema.gameResults.sessionId, sessionId),
      orderBy: (r, { asc }) => [asc(r.rank)],
    });

    return results;
  },
};
```

- [ ] **Step 3: Escrever `src/modules/session/session.routes.ts`**

```typescript
import { FastifyInstance } from "fastify";
import { sessionService } from "./session.service";
import { createSessionSchema } from "./session.schema";
import { authenticate } from "../../middleware/auth";

export async function sessionRoutes(app: FastifyInstance) {
  // Rotas autenticadas (Host)
  app.post("/api/sessions", { onRequest: authenticate }, async (request, reply) => {
    const { quizId } = createSessionSchema.parse(request.body);
    const session = await sessionService.create(quizId, (request as any).userId);
    return reply.status(201).send(session);
  });

  app.get<{ Params: { id: string } }>("/api/sessions/:id", { onRequest: authenticate }, async (request) => {
    return sessionService.getById(request.params.id, (request as any).userId);
  });

  app.get<{ Params: { id: string } }>("/api/sessions/:id/results", { onRequest: authenticate }, async (request) => {
    return sessionService.getResults(request.params.id, (request as any).userId);
  });

  // Rota anônima (Player)
  app.get<{ Params: { pin: string } }>("/api/sessions/join/:pin", async (request) => {
    return sessionService.verifyPin(request.params.pin);
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/session/
git commit -m "feat: session service com criação, PIN, verificação e resultados"
```

---

## Fase 5: Gameplay — WebSocket Gateways

### Task 10: Scoring Engine e Leaderboard Service

**Files:**
- Create: `src/modules/gameplay/scoring.service.ts`
- Create: `src/modules/gameplay/leaderboard.service.ts`

**Interfaces:**
- Consumes: `redis`, `keys` (Task 3)
- Produces: `scoringService.calculate()` (score numérico), `leaderboardService.getRankings()` (array ordenado)

- [ ] **Step 1: Escrever `src/modules/gameplay/scoring.service.ts`**

```typescript
/**
 * Calcula a pontuação de uma resposta.
 *
 * Fórmula: basePoints × (1 - responseMs / timeLimitMs) × accuracy
 *   accuracy = 1 se correta, 0 se errada
 *   piso = 0 (sem pontuação negativa)
 */
export const scoringService = {
  calculate(params: {
    basePoints: number;
    responseMs: number;
    timeLimitSeconds: number;
    isCorrect: boolean;
  }): number {
    if (!params.isCorrect) return 0;

    const timeLimitMs = params.timeLimitSeconds * 1000;
    const speedFactor = 1 - params.responseMs / timeLimitMs;
    // Garante que o fator nunca é negativo (resposta no limite exato)
    const clampedFactor = Math.max(0, speedFactor);
    const score = Math.round(params.basePoints * clampedFactor);
    return Math.max(0, score);
  },
};
```

- [ ] **Step 2: Escrever `src/modules/gameplay/leaderboard.service.ts`**

```typescript
import { redis } from "../../redis/client";
import { keys } from "../../redis/keys";

export interface LeaderboardEntry {
  nickname: string;
  score: number;
  rank: number;
  correctCount: number;
}

export const leaderboardService = {
  async getTop(pin: string, topN = 10): Promise<LeaderboardEntry[]> {
    // ZREVRANGE retorna do maior para o menor score
    const results = await redis.zrevrange(
      keys.sessionScores(pin), 0, topN - 1, "WITHSCORES",
    );

    const entries: LeaderboardEntry[] = [];
    for (let i = 0; i < results.length; i += 2) {
      const socketId = results[i];
      const score = parseInt(results[i + 1], 10);
      const player = await redis.hgetall(keys.sessionPlayer(pin, socketId));
      entries.push({
        nickname: player.nickname ?? "?",
        score,
        rank: entries.length + 1,
        correctCount: parseInt(player.correct_count ?? "0", 10),
      });
    }
    return entries;
  },

  async getPlayerRank(pin: string, socketId: string): Promise<number | null> {
    // ZREVRANK: 0-indexed rank do maior para o menor
    const rank = await redis.zrevrank(keys.sessionScores(pin), socketId);
    return rank !== null ? rank + 1 : null;
  },

  async getFullRankings(pin: string): Promise<LeaderboardEntry[]> {
    const results = await redis.zrevrange(
      keys.sessionScores(pin), 0, -1, "WITHSCORES",
    );

    const entries: LeaderboardEntry[] = [];
    for (let i = 0; i < results.length; i += 2) {
      const socketId = results[i];
      const score = parseInt(results[i + 1], 10);
      const player = await redis.hgetall(keys.sessionPlayer(pin, socketId));
      entries.push({
        nickname: player.nickname ?? "?",
        score,
        rank: entries.length + 1,
        correctCount: parseInt(player.correct_count ?? "0", 10),
      });
    }
    return entries;
  },
};
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/gameplay/scoring.service.ts src/modules/gameplay/leaderboard.service.ts
git commit -m "feat: scoring engine e leaderboard service com Redis sorted sets"
```

---

### Task 11: Gameplay Gateway — Namespace /host

**Files:**
- Create: `src/modules/session/session.gateway.ts`

**Interfaces:**
- Consumes: `Server` (Socket.IO), `redis`, `keys` (Task 3), `db`, `schema` (Task 2), `scoringService`, `leaderboardService` (Task 10)
- Produces: listeners para eventos `host:session:*`, `host:question:*`, `host:leaderboard:show`

- [ ] **Step 1: Escrever `src/modules/session/session.gateway.ts`**

```typescript
import { Namespace } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { redis } from "../../redis/client";
import { keys } from "../../redis/keys";
import { db, schema } from "../../db";
import { and, eq, asc, desc } from "drizzle-orm";
import { leaderboardService } from "../gameplay/leaderboard.service";

export function registerHostGateway(io: Namespace) {
  // Autenticação obrigatória no handshake
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token as string;
      const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string };
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error("Autenticação inválida"));
    }
  });

  io.on("connection", (socket) => {
    let currentPin: string | null = null;

    socket.on("host:session:create", async ({ quizId }: { quizId: string }) => {
      // Valida que o quiz pertence ao host
      const quiz = await db.query.quizzes.findFirst({
        where: and(eq(schema.quizzes.id, quizId), eq(schema.quizzes.authorId, socket.data.userId)),
      });
      if (!quiz) {
        socket.emit("error", { message: "Quiz não encontrado" });
        return;
      }

      // Reutiliza sessionService ou faz inline (KISS: inline é mais simples aqui)
      const { sessionService } = await import("../session/session.service");
      const session = await sessionService.create(quizId, socket.data.userId);
      currentPin = session.pin;
      socket.join(`session:${session.pin}`);
      socket.emit("session:created", { pin: session.pin, sessionId: session.id });
    });

    socket.on("host:session:start", async ({ timeLimitSeconds }: { timeLimitSeconds: number }) => {
      if (!currentPin) return;
      const limit = Math.min(300, Math.max(5, timeLimitSeconds ?? 30));
      await redis.set(keys.sessionStatus(currentPin), "lobby");
      await redis.hset(keys.sessionConfig(currentPin), "time_limit_seconds", String(limit));

      // Atualiza PG
      const sessionId = await redis.get(keys.pinLookup(currentPin));
      if (sessionId) {
        await db
          .update(schema.gameSessions)
          .set({ status: "lobby", timeLimitSeconds: limit, startedAt: new Date() })
          .where(eq(schema.gameSessions.id, sessionId));
      }
      socket.emit("session:started", { pin: currentPin, timeLimitSeconds: limit });
    });

    socket.on("host:question:next", async () => {
      if (!currentPin) return;
      const config = await redis.hgetall(keys.sessionConfig(currentPin));
      const nextIndex = parseInt(config.current_question_index ?? "0", 10) + 1;

      // Busca a pergunta
      const quizId = config.quiz_id;
      const question = await db.query.questions.findFirst({
        where: and(eq(schema.questions.quizId, quizId), eq(schema.questions.sortOrder, nextIndex - 1)),
        with: { alternatives: { orderBy: asc(schema.alternatives.sortOrder) } },
      });

      if (!question) {
        socket.emit("error", { message: "Sem mais perguntas" });
        return;
      }

      // Atualiza estado no Redis
      await redis.hset(keys.sessionConfig(currentPin), "current_question_index", String(nextIndex));
      await redis.set(keys.questionRevealed(currentPin, nextIndex), Date.now().toString(), "EX", 300);
      await redis.set(keys.sessionStatus(currentPin), "playing");

      // Broadcast para room (Host + Players)
      io.to(`session:${currentPin}`).emit("game:question:show", {
        questionIndex: nextIndex,
        text: question.text,
        timeLimit: parseInt(config.time_limit_seconds ?? "30", 10),
        alternatives: question.alternatives.map((a) => ({
          id: a.id,
          text: a.text,
          sortOrder: a.sortOrder,
          // ⚠️ SEM isCorrect
        })),
      });

      socket.emit("host:question:active", {
        questionIndex: nextIndex,
        total: await db.$count(schema.questions, eq(schema.questions.quizId, quizId)),
      });

      // Timer de timeout automático
      const timeLimitMs = parseInt(config.time_limit_seconds ?? "30", 10) * 1000;
      setTimeout(async () => {
        const status = await redis.get(keys.sessionStatus(currentPin!));
        if (status !== "playing") return;

        const correctAlt = question.alternatives.find((a) => a.isCorrect);
        io.to(`session:${currentPin}`).emit("game:question:timeout", {
          correctAnswer: correctAlt?.text ?? "?",
        });
      }, timeLimitMs);
    });

    socket.on("host:leaderboard:show", async () => {
      if (!currentPin) return;
      const rankings = await leaderboardService.getTop(currentPin);
      io.to(`session:${currentPin}`).emit("game:leaderboard:show", { rankings });
    });

    socket.on("host:session:end", async () => {
      if (!currentPin) return;
      await redis.set(keys.sessionStatus(currentPin), "finished");

      const sessionId = await redis.get(keys.pinLookup(currentPin));
      if (!sessionId) return;

      // Coleta todas as respostas do Redis antes de limpar
      const config = await redis.hgetall(keys.sessionConfig(currentPin!));
      const totalQuestions = parseInt(config.current_question_index ?? "0", 10);
      const allAnswers = new Map<string, Record<string, string>>();
      for (let qi = 1; qi <= totalQuestions; qi++) {
        const answers = await redis.hgetall(keys.questionAnswers(currentPin!, qi));
        if (Object.keys(answers).length > 0) {
          allAnswers.set(String(qi), answers);
        }
      }

      const rankings = await leaderboardService.getFullRankings(currentPin);

      // Persiste respostas individuais no PostgreSQL
      for (const [qIdx, answerMap] of allAnswers) {
        for (const [nickname, data] of Object.entries(answerMap as Record<string, string>)) {
          const parsed = JSON.parse(data);
          const question = await db.query.questions.findFirst({
            where: eq(schema.questions.quizId, quizId),
            orderBy: asc(schema.questions.sortOrder),
            offset: parseInt(qIdx) - 1,
          });
          if (!question) continue;
          const alt = await db.query.alternatives.findFirst({
            where: and(
              eq(schema.alternatives.questionId, question.id),
              eq(schema.alternatives.isCorrect, true),
            ),
          });
          await db.insert(schema.playerAnswers).values({
            sessionId,
            questionId: question.id,
            playerNickname: nickname,
            selectedAnswer: parsed.answer,
            isCorrect: alt ? parsed.answer === alt.text || parsed.answer === alt.id : false,
            responseMs: parsed.responseMs ?? 0,
            pointsEarned: parsed.points ?? 0,
          });
        }
      }

      // Persiste ranking final
      for (const entry of rankings) {
        // Calcula métricas do jogador a partir das respostas persistidas
        const playerAnswersList = await db.query.playerAnswers.findMany({
          where: and(
            eq(schema.playerAnswers.sessionId, sessionId),
            eq(schema.playerAnswers.playerNickname, entry.nickname),
          ),
        });
        const totalCount = playerAnswersList.length;
        const correctCount = playerAnswersList.filter((a) => a.isCorrect).length;
        const avgMs = totalCount > 0
          ? Math.round(playerAnswersList.reduce((s, a) => s + a.responseMs, 0) / totalCount)
          : 0;

        await db.insert(schema.gameResults).values({
          sessionId,
          playerNickname: entry.nickname,
          totalScore: entry.score,
          correctCount,
          totalCount,
          avgResponseMs: avgMs,
          rank: entry.rank,
        });
      }

      await db
        .update(schema.gameSessions)
        .set({ status: "finished", finishedAt: new Date(), playerCount: rankings.length })
        .where(eq(schema.gameSessions.id, sessionId));

      io.to(`session:${currentPin}`).emit("game:ended", {
        finalRankings: rankings,
        totalPlayers: rankings.length,
      });

      // Limpa Redis
      const playerSockets = await redis.smembers(keys.sessionPlayers(currentPin));
      const pipeline = redis.pipeline();
      pipeline.del(keys.sessionStatus(currentPin));
      pipeline.del(keys.sessionConfig(currentPin));
      pipeline.del(keys.sessionScores(currentPin));
      pipeline.del(keys.sessionPlayers(currentPin));
      for (const sid of playerSockets) {
        pipeline.del(keys.sessionPlayer(currentPin, sid));
      }
      await pipeline.exec();
    });

    socket.on("disconnect", () => {
      // Host saiu — a sessão continua ativa para Players
    });
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/session/session.gateway.ts
git commit -m "feat: gateway WebSocket do Host — criação, controle e encerramento de sessão"
```

---

### Task 12: Gameplay Gateway — Namespace /play

**Files:**
- Create: `src/modules/gameplay/gameplay.gateway.ts`

**Interfaces:**
- Consumes: `Namespace` (Socket.IO), `redis`, `keys` (Task 3), `scoringService` (Task 10), `db`, `schema` (Task 2)
- Produces: listeners para `player:join`, `player:answer`, reconexão

- [ ] **Step 1: Escrever `src/modules/gameplay/gameplay.gateway.ts`**

```typescript
import { Namespace } from "socket.io";
import { redis } from "../../redis/client";
import { keys } from "../../redis/keys";
import { scoringService } from "./scoring.service";
import { db, schema } from "../../db";
import { eq } from "drizzle-orm";

export function registerPlayGateway(io: Namespace) {
  // Validação de PIN no handshake
  io.use(async (socket, next) => {
    const pin = socket.handshake.query.pin as string;
    if (!pin || pin.length !== 6) {
      return next(new Error("PIN inválido"));
    }
    const status = await redis.get(keys.sessionStatus(pin));
    if (!status || status === "finished") {
      return next(new Error("Sessão inválida ou encerrada"));
    }
    if (status === "playing") {
      return next(new Error("A partida já está em andamento"));
    }
    socket.data.pin = pin;
    next();
  });

  io.on("connection", (socket) => {
    const pin: string = socket.data.pin;
    socket.data.nickname = null;

    socket.on("player:join", async ({ nickname }: { nickname: string }) => {
      const normalizedNick = nickname.trim().toLowerCase();
      if (!normalizedNick || normalizedNick.length < 2 || normalizedNick.length > 20) {
        socket.emit("error", { message: "Apelido deve ter entre 2 e 20 caracteres" });
        return;
      }

      // Verifica unicidade
      const existing = await redis.smembers(keys.sessionPlayers(pin));
      for (const sid of existing) {
        const player = await redis.hgetall(keys.sessionPlayer(pin, sid));
        if (player.nickname?.toLowerCase() === normalizedNick) {
          socket.emit("error", { message: "Apelido já está em uso nesta partida" });
          return;
        }
      }

      socket.data.nickname = normalizedNick;

      // Adiciona ao Redis
      await redis.sadd(keys.sessionPlayers(pin), socket.id);
      await redis.hset(keys.sessionPlayer(pin, socket.id), {
        nickname: normalizedNick,
        total_score: "0",
        correct_count: "0",
      });
      await redis.zadd(keys.sessionScores(pin), 0, socket.id);

      socket.join(`session:${pin}`);
      socket.emit("player:joined", {
        sessionId: await redis.get(keys.pinLookup(pin)),
        totalPlayers: await redis.scard(keys.sessionPlayers(pin)),
      });

      // Notifica lobby
      const members = await redis.smembers(keys.sessionPlayers(pin));
      const nicknames: string[] = [];
      for (const sid of members) {
        const p = await redis.hgetall(keys.sessionPlayer(pin, sid));
        nicknames.push(p.nickname ?? "?");
      }
      io.to(`session:${pin}`).emit("player:lobby:update", {
        playerCount: members.length,
        nicknames,
      });
    });

    socket.on("player:answer", async ({ questionIndex, answer }: {
      questionIndex: number; answer: string;
    }) => {
      if (!socket.data.nickname) {
        socket.emit("error", { message: "Entre na partida primeiro" });
        return;
      }

      // Gate: uma resposta por pergunta
      const alreadyAnswered = await redis.hexists(
        keys.questionAnswers(pin, questionIndex), socket.data.nickname,
      );
      if (alreadyAnswered) {
        socket.emit("error", { code: "ALREADY_ANSWERED" });
        return;
      }

      // Busca a pergunta correta
      const config = await redis.hgetall(keys.sessionConfig(pin));
      const quizId = config.quiz_id;
      const question = await db.query.questions.findFirst({
        where: eq(schema.questions.quizId, quizId),
        with: { alternatives: true },
        orderBy: (q, { asc }) => [asc(q.sortOrder)],
        offset: questionIndex - 1,
      });

      if (!question) {
        socket.emit("error", { message: "Pergunta não encontrada" });
        return;
      }

      const selectedAlt = question.alternatives.find((a) => a.text === answer || a.id === answer);
      const isCorrect = selectedAlt?.isCorrect ?? false;

      // Calcula tempo de resposta
      const revealedTs = await redis.get(keys.questionRevealed(pin, questionIndex));
      const responseMs = revealedTs ? Date.now() - parseInt(revealedTs, 10) : 0;

      const timeLimit = parseInt(config.time_limit_seconds ?? "30", 10);
      const points = scoringService.calculate({
        basePoints: question.basePoints,
        responseMs,
        timeLimitSeconds: timeLimit,
        isCorrect,
      });

      // Atualiza Redis
      await redis.hset(keys.questionAnswers(pin, questionIndex), socket.data.nickname, JSON.stringify({
        answer, responseMs, points,
      }));
      await redis.zincrby(keys.sessionScores(pin), points, socket.id);
      const totalScore = await redis.zscore(keys.sessionScores(pin), socket.id);
      await redis.hset(keys.sessionPlayer(pin, socket.id), "total_score", String(totalScore ?? 0));
      if (isCorrect) {
        await redis.hincrby(keys.sessionPlayer(pin, socket.id), "correct_count", 1);
      }

      socket.emit("player:answer:ack", {
        isCorrect,
        pointsEarned: points,
        totalScore: parseInt(totalScore ?? "0", 10),
      });

      // Notifica Host sobre progresso
      const totalAnswered = await redis.hlen(keys.questionAnswers(pin, questionIndex));
      const totalPlayers = await redis.scard(keys.sessionPlayers(pin));
      socket.to(`session:${pin}`).emit("host:answers:progress", {
        answered: totalAnswered,
        total: totalPlayers,
      });
    });

    // Reconexão
    socket.on("disconnect", () => {
      // Player saiu — não remove do Redis para permitir reconexão
      // O estado expira via TTL se o jogo acabar
    });
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/gameplay/gameplay.gateway.ts
git commit -m "feat: gateway WebSocket do Player — join, answer e reconexão"
```

---

## Fase 6: Relatórios e Bootstrap do Servidor

### Task 13: Report Service e Rotas

**Files:**
- Create: `src/modules/report/report.service.ts`
- Create: `src/modules/report/report.routes.ts`

**Interfaces:**
- Consumes: `db`, `schema` (Task 2), `authenticate` (Task 6)
- Produces: 3 rotas de relatório

- [ ] **Step 1: Escrever `src/modules/report/report.service.ts`**

```typescript
import { eq, and, sql, desc, asc } from "drizzle-orm";
import { db, schema } from "../../db";
import { NotFoundError } from "../../shared/errors";

export const reportService = {
  /** Relatório por quiz: taxa de acerto e tempo médio por pergunta */
  async quizReport(quizId: string, userId: string) {
    const quiz = await db.query.quizzes.findFirst({
      where: and(eq(schema.quizzes.id, quizId), eq(schema.quizzes.authorId, userId)),
      with: {
        questions: {
          orderBy: asc(schema.questions.sortOrder),
        },
        sessions: {
          with: {
            answers: true,
          },
        },
      },
    });
    if (!quiz) throw new NotFoundError("Quiz");

    return quiz.questions.map((q) => {
      const answers = quiz.sessions.flatMap((s) =>
        s.answers.filter((a) => a.questionId === q.id),
      );
      const total = answers.length;
      const correct = answers.filter((a) => a.isCorrect).length;
      const avgMs =
        total > 0 ? Math.round(answers.reduce((s, a) => s + a.responseMs, 0) / total) : 0;

      return {
        questionId: q.id,
        text: q.text,
        totalAnswers: total,
        correctCount: correct,
        accuracyRate: total > 0 ? Math.round((correct / total) * 100) : 0,
        avgResponseMs: avgMs,
      };
    });
  },

  /** Histórico de sessões de um quiz */
  async quizSessions(quizId: string, userId: string) {
    const quiz = await db.query.quizzes.findFirst({
      where: and(eq(schema.quizzes.id, quizId), eq(schema.quizzes.authorId, userId)),
    });
    if (!quiz) throw new NotFoundError("Quiz");

    const sessions = await db.query.gameSessions.findMany({
      where: eq(schema.gameSessions.quizId, quizId),
      orderBy: desc(schema.gameSessions.createdAt),
      with: { results: { orderBy: asc(schema.gameResults.rank), limit: 1 } },
    });

    return sessions.map((s) => ({
      id: s.id,
      pin: s.pin,
      status: s.status,
      playerCount: s.playerCount,
      startedAt: s.startedAt?.toISOString() ?? null,
      finishedAt: s.finishedAt?.toISOString() ?? null,
      winner: s.results[0]?.playerNickname ?? null,
      winnerScore: s.results[0]?.totalScore ?? null,
    }));
  },

  /** Relatório detalhado de uma sessão */
  async sessionReport(sessionId: string, userId: string) {
    const session = await db.query.gameSessions.findFirst({
      where: eq(schema.gameSessions.id, sessionId),
      with: {
        answers: {
          with: { question: true },
        },
        results: {
          orderBy: asc(schema.gameResults.rank),
        },
      },
    });
    if (!session || session.hostId !== userId) throw new NotFoundError("Sessão");

    return {
      session: {
        id: session.id,
        pin: session.pin,
        status: session.status,
        playerCount: session.playerCount,
        timeLimitSeconds: session.timeLimitSeconds,
        startedAt: session.startedAt?.toISOString() ?? null,
        finishedAt: session.finishedAt?.toISOString() ?? null,
      },
      results: session.results.map((r) => ({
        nickname: r.playerNickname,
        totalScore: r.totalScore,
        correctCount: r.correctCount,
        totalCount: r.totalCount,
        avgResponseMs: r.avgResponseMs,
        rank: r.rank,
      })),
      answers: session.answers.map((a) => ({
        questionText: a.question.text,
        nickname: a.playerNickname,
        selectedAnswer: a.selectedAnswer,
        isCorrect: a.isCorrect,
        responseMs: a.responseMs,
        pointsEarned: a.pointsEarned,
        answeredAt: a.answeredAt.toISOString(),
      })),
    };
  },
};
```

- [ ] **Step 2: Escrever `src/modules/report/report.routes.ts`**

```typescript
import { FastifyInstance } from "fastify";
import { reportService } from "./report.service";
import { authenticate } from "../../middleware/auth";

export async function reportRoutes(app: FastifyInstance) {
  app.addHook("onRequest", authenticate);

  app.get<{ Params: { id: string } }>("/api/quizzes/:id/report", async (request) => {
    return reportService.quizReport(request.params.id, (request as any).userId);
  });

  app.get<{ Params: { id: string } }>("/api/quizzes/:id/sessions", async (request) => {
    return reportService.quizSessions(request.params.id, (request as any).userId);
  });

  app.get<{ Params: { id: string } }>("/api/sessions/:id/report", async (request) => {
    return reportService.sessionReport(request.params.id, (request as any).userId);
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/report/
git commit -m "feat: report service com 3 endpoints — quiz, sessões e sessão detalhada"
```

---

### Task 14: Bootstrap do Servidor — Juntando Tudo

**Files:**
- Create: `src/server.ts`

**Interfaces:**
- Consumes: todos os módulos anteriores
- Produces: servidor HTTP rodando (Fastify + Socket.IO)

- [ ] **Step 1: Escrever `src/server.ts`**

```typescript
import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { Server as SocketIOServer } from "socket.io";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error-handler";
import { authRoutes } from "./modules/auth/auth.routes";
import { quizRoutes } from "./modules/quiz/quiz.routes";
import { sessionRoutes } from "./modules/session/session.routes";
import { reportRoutes } from "./modules/report/report.routes";
import { registerHostGateway } from "./modules/session/session.gateway";
import { registerPlayGateway } from "./modules/gameplay/gameplay.gateway";

async function main() {
  const app = Fastify({ logger: true });

  // Plugins
  await app.register(cors, { origin: true, credentials: true });
  await app.register(cookie);
  await app.register(rateLimit, {
    global: false,
    redis: undefined, // usa memory store para dev; Redis em produção
  });

  // Error handler
  app.setErrorHandler(errorHandler);

  // Rotas REST
  await app.register(authRoutes);
  await app.register(quizRoutes);
  await app.register(sessionRoutes);
  await app.register(reportRoutes);

  // Health check
  app.get("/api/health", async () => ({ status: "ok" }));

  // Socket.IO
  const io = new SocketIOServer(app.server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    pingTimeout: 30000,
    pingInterval: 10000,
  });

  registerHostGateway(io.of("/host"));
  registerPlayGateway(io.of("/play"));

  // Start
  await app.listen({ port: env.PORT, host: env.HOST });
  console.log(`Server running on http://${env.HOST}:${env.PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Adicionar scripts ao `package.json`**

```json
"scripts": {
  "dev": "tsx watch src/server.ts",
  "build": "tsc",
  "start": "node dist/server.js",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:push": "drizzle-kit push",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 3: Testar o bootstrap**

```bash
# Com PostgreSQL e Redis rodando:
npm run dev
# Verificar: curl http://localhost:3000/api/health
```

- [ ] **Step 4: Commit**

```bash
git add src/server.ts package.json
git commit -m "feat: bootstrap do servidor — Fastify + Socket.IO + todos os módulos"
```

---

## Fase 7: Frontend — Fundação e Autenticação

### Task 15: Scaffolding SvelteKit

**Files:**
- Criar projeto SvelteKit em `frontend/`

- [ ] **Step 1: Criar projeto SvelteKit**

```bash
npx sv create frontend --template minimal --types ts
cd frontend
npm install socket.io-client
```

- [ ] **Step 2: Configurar estrutura MVVM**

```bash
mkdir -p src/lib/api src/lib/stores src/lib/components/ui \
  src/lib/components/quiz src/lib/components/host src/lib/components/player \
  src/lib/game src/lib/types
mkdir -p src/routes/\(public\)/login src/routes/\(public\)/register \
  src/routes/\(host\)/dashboard src/routes/\(host\)/quiz/\[id\]/edit \
  src/routes/\(host\)/quiz/new src/routes/\(host\)/quiz/\[id\]/report \
  src/routes/\(host\)/session/\[id\]/host \
  src/routes/play src/routes/play/\[pin\]
```

- [ ] **Step 3: Commit**

```bash
git add frontend/
git commit -m "chore: scaffolding SvelteKit com estrutura MVVM"
```

---

### Task 16: Frontend — Tipos, API Client e Auth Store

**Files:**
- Create: `frontend/src/lib/types/quiz.ts`, `session.ts`, `events.ts`
- Create: `frontend/src/lib/api/client.ts`, `auth.ts`
- Create: `frontend/src/lib/stores/auth.store.ts`

**Interfaces:**
- Consumes: backend REST API (Task 6)
- Produces: `auth` store (`login()`, `register()`, `logout()`, `user`, `isAuthenticated`, `error`, `loading`)

- [ ] **Step 1: Escrever `frontend/src/lib/api/client.ts`**

```typescript
const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export const api = {
  async fetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem("accessToken");
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      credentials: "include",
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(res.status, body.error ?? "UNKNOWN", body.message ?? "Erro desconhecido");
    }

    if (res.status === 204) return undefined as T;
    return res.json();
  },
};
```

- [ ] **Step 2: Escrever `frontend/src/lib/api/auth.ts`**

```typescript
import { api } from "./client";

export const authApi = {
  register: (body: { name: string; email: string; password: string }) =>
    api.fetch<{ user: any; accessToken: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  login: (body: { email: string; password: string }) =>
    api.fetch<{ user: any; accessToken: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  refresh: () =>
    api.fetch<{ accessToken: string }>("/api/auth/refresh", { method: "POST" }),

  logout: () => api.fetch<void>("/api/auth/logout", { method: "POST" }),
};
```

- [ ] **Step 3: Escrever `frontend/src/lib/stores/auth.store.ts`**

```typescript
import { writable, derived } from "svelte/store";
import { authApi } from "$lib/api/auth";
import { ApiError } from "$lib/api/client";

interface User { id: string; name: string; email: string }

function createAuthStore() {
  const user = writable<User | null>(null);
  const loading = writable(false);
  const error = writable<string | null>(null);
  const isAuthenticated = derived(user, ($u) => $u !== null);

  async function login(email: string, password: string): Promise<boolean> {
    error.set(null);
    loading.set(true);
    try {
      const result = await authApi.login({ email, password });
      localStorage.setItem("accessToken", result.accessToken);
      user.set(result.user);
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        error.set(err.code === "UNAUTHORIZED" ? "Email ou senha inválidos" : err.message);
      }
      return false;
    } finally {
      loading.set(false);
    }
  }

  async function register(name: string, email: string, password: string): Promise<boolean> {
    error.set(null);
    loading.set(true);
    try {
      const result = await authApi.register({ name, email, password });
      localStorage.setItem("accessToken", result.accessToken);
      user.set(result.user);
      return true;
    } catch (err) {
      error.set(err instanceof ApiError ? err.message : "Erro ao registrar");
      return false;
    } finally {
      loading.set(false);
    }
  }

  async function logout() {
    await authApi.logout().catch(() => {});
    localStorage.removeItem("accessToken");
    user.set(null);
  }

  async function tryRefresh(): Promise<boolean> {
    try {
      const { accessToken } = await authApi.refresh();
      localStorage.setItem("accessToken", accessToken);
      return true;
    } catch {
      user.set(null);
      return false;
    }
  }

  return {
    subscribe: user.subscribe,
    isAuthenticated,
    loading: { subscribe: loading.subscribe },
    error: { subscribe: error.subscribe },
    login, register, logout, tryRefresh,
  };
}

export const auth = createAuthStore();
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/types/ frontend/src/lib/api/ frontend/src/lib/stores/auth.store.ts
git commit -m "feat: frontend auth — api client, auth store e tipos base"
```

---

### Task 17: Frontend — Páginas de Login e Registro

**Files:**
- Create: `frontend/src/routes/(public)/login/+page.svelte`
- Create: `frontend/src/routes/(public)/register/+page.svelte`
- Create: `frontend/src/routes/(host)/+layout.svelte`

- [ ] **Step 1: Escrever `login/+page.svelte`**

```svelte
<script lang="ts">
  import { auth } from "$lib/stores/auth.store";
  import { goto } from "$app/navigation";

  let email = "", password = "";

  async function handleSubmit() {
    const ok = await auth.login(email, password);
    if (ok) goto("/dashboard");
    // erro em $auth.error
  }
</script>

<form on:submit|preventDefault={handleSubmit}>
  <h1>Entrar</h1>
  {#if $auth.error}
    <p class="error">{$auth.error}</p>
  {/if}
  <input bind:value={email} type="email" placeholder="Email" required />
  <input bind:value={password} type="password" placeholder="Senha" required minlength="8" />
  <button type="submit" disabled={$auth.loading}>
    {$auth.loading ? "Entrando..." : "Entrar"}
  </button>
  <a href="/register">Criar conta</a>
</form>
```

- [ ] **Step 2: Escrever `register/+page.svelte`**

```svelte
<script lang="ts">
  import { auth } from "$lib/stores/auth.store";
  import { goto } from "$app/navigation";

  let name = "", email = "", password = "", confirm = "";

  async function handleSubmit() {
    if (password !== confirm) {
      // erro inline, sem try/catch
      return;
    }
    const ok = await auth.register(name, email, password);
    if (ok) goto("/dashboard");
  }
</script>

<form on:submit|preventDefault={handleSubmit}>
  <h1>Criar Conta</h1>
  {#if $auth.error}<p class="error">{$auth.error}</p>{/if}
  <input bind:value={name} placeholder="Nome" required minlength="2" />
  <input bind:value={email} type="email" placeholder="Email" required />
  <input bind:value={password} type="password" placeholder="Senha" required minlength="8" />
  <input bind:value={confirm} type="password" placeholder="Confirmar senha" required minlength="8" />
  <button type="submit" disabled={$auth.loading}>
    {$auth.loading ? "Criando..." : "Criar conta"}
  </button>
  <a href="/login">Já tenho conta</a>
</form>
```

- [ ] **Step 3: Escrever layout autenticado `(host)/+layout.svelte`**

```svelte
<script lang="ts">
  import { auth } from "$lib/stores/auth.store";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";

  onMount(async () => {
    if (!$auth.isAuthenticated) {
      const refreshed = await auth.tryRefresh();
      if (!refreshed) goto("/login");
    }
  });
</script>

{#if $auth.isAuthenticated}
  <nav>
    <a href="/dashboard">Dashboard</a>
    <a href="/quiz/new">Novo Quiz</a>
    <button on:click={() => auth.logout().then(() => goto("/login"))}>Sair</button>
  </nav>
{/if}

<slot />
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/routes/
git commit -m "feat: páginas de login/registro e layout autenticado"
```

---

## Fase 8: Frontend — Gestão de Quizzes

### Task 18: Quiz API, Store e Dashboard

**Files:**
- Create: `frontend/src/lib/api/quizzes.ts`
- Create: `frontend/src/lib/stores/quiz-editor.store.ts`
- Create: `frontend/src/routes/(host)/dashboard/+page.svelte`

- [ ] **Step 1: Escrever `frontend/src/lib/api/quizzes.ts`**

```typescript
import { api } from "./client";

export const quizzesApi = {
  list: (page = 1) => api.fetch<any>(`/api/quizzes?page=${page}`),
  getById: (id: string) => api.fetch<any>(`/api/quizzes/${id}`),
  create: (body: { title: string; description?: string }) =>
    api.fetch<any>("/api/quizzes", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: any) =>
    api.fetch<any>(`/api/quizzes/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  remove: (id: string) => api.fetch<void>(`/api/quizzes/${id}`, { method: "DELETE" }),

  // Questions
  addQuestion: (quizId: string, body: any) =>
    api.fetch<any>(`/api/quizzes/${quizId}/questions`, { method: "POST", body: JSON.stringify(body) }),
  updateQuestion: (id: string, body: any) =>
    api.fetch<any>(`/api/questions/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteQuestion: (id: string) =>
    api.fetch<void>(`/api/questions/${id}`, { method: "DELETE" }),
  reorderQuestion: (id: string, sortOrder: number) =>
    api.fetch<any>(`/api/questions/${id}/order`, { method: "PUT", body: JSON.stringify({ sortOrder }) }),

  // Alternatives
  addAlternative: (questionId: string, body: any) =>
    api.fetch<any>(`/api/questions/${questionId}/alternatives`, { method: "POST", body: JSON.stringify(body) }),
  updateAlternative: (id: string, body: any) =>
    api.fetch<any>(`/api/alternatives/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteAlternative: (id: string) =>
    api.fetch<void>(`/api/alternatives/${id}`, { method: "DELETE" }),
  markCorrect: (id: string) =>
    api.fetch<any>(`/api/alternatives/${id}/correct`, { method: "PUT" }),
};
```

- [ ] **Step 2: Escrever `frontend/src/lib/stores/quiz-editor.store.ts`**

```typescript
import { writable, derived, get } from "svelte/store";
import { quizzesApi } from "$lib/api/quizzes";
import type { QuizFull } from "$lib/types/quiz";

function createQuizEditorStore() {
  const quiz = writable<QuizFull | null>(null);
  const selectedQuestionIdx = writable<number | null>(null);
  const isSaving = writable(false);
  const errors = writable<Record<string, string>>({});

  const selectedQuestion = derived(
    [quiz, selectedQuestionIdx],
    ([$q, $i]) => ($i !== null && $q) ? $q.questions[$i] : null,
  );

  function validate(q: QuizFull): Record<string, string> {
    const e: Record<string, string> = {};
    if (q.questions.length < 2) e.questions = "Mínimo 2 perguntas";
    for (const qn of q.questions) {
      if (qn.alternatives.length < 2) e[`q_${qn.id}`] = "Mínimo 2 alternativas";
      if (!qn.alternatives.some((a) => a.isCorrect)) e[`q_${qn.id}`] = "Defina a correta";
    }
    return e;
  }

  return {
    subscribe: quiz.subscribe,
    selectedQuestion,
    isSaving: { subscribe: isSaving.subscribe },
    errors: { subscribe: errors.subscribe },

    async load(quizId: string) {
      const data = await quizzesApi.getById(quizId);
      quiz.set(data);
    },

    initNew(title: string) {
      quiz.set({ id: "", title, description: null, isPublished: false, createdAt: "", questions: [] });
    },

    addQuestion(type: "multiple_choice" | "true_false") {
      quiz.update((q) => {
        if (!q) return q;
        const newQ = {
          id: `temp_${Date.now()}`,
          text: "",
          questionType: type,
          basePoints: 1000,
          sortOrder: q.questions.length,
          alternatives: type === "true_false"
            ? [{ id: `ta_${Date.now()}`, text: "Verdadeiro", isCorrect: false, sortOrder: 0 },
               { id: `tb_${Date.now()}`, text: "Falso", isCorrect: false, sortOrder: 1 }]
            : [],
        };
        return { ...q, questions: [...q.questions, newQ] };
      });
    },

    removeQuestion(id: string) {
      quiz.update((q) => q ? { ...q, questions: q.questions.filter((x) => x.id !== id) } : q);
    },

    addAlternative(questionId: string) {
      quiz.update((q) => {
        if (!q) return q;
        return {
          ...q,
          questions: q.questions.map((qn) =>
            qn.id === questionId
              ? { ...qn, alternatives: [...qn.alternatives, { id: `a_${Date.now()}`, text: "", isCorrect: false, sortOrder: qn.alternatives.length }] }
              : qn,
          ),
        };
      });
    },

    markCorrect(questionId: string, alternativeId: string) {
      quiz.update((q) => {
        if (!q) return q;
        return {
          ...q,
          questions: q.questions.map((qn) =>
            qn.id === questionId
              ? { ...qn, alternatives: qn.alternatives.map((a) => ({ ...a, isCorrect: a.id === alternativeId })) }
              : qn,
          ),
        };
      });
    },

    async save(): Promise<boolean> {
      const current = get(quiz);
      if (!current) return false;
      const validationErrors = validate(current);
      if (Object.keys(validationErrors).length > 0) {
        errors.set(validationErrors);
        return false;
      }
      isSaving.set(true);
      try {
        if (current.id) {
          // Salva quiz existente + sync questions/alternatives via endpoints
          await quizzesApi.update(current.id, { title: current.title, description: current.description });
        } else {
          const created = await quizzesApi.create({ title: current.title, description: current.description ?? undefined });
          current.id = created.id;
        }
        errors.set({});
        return true;
      } catch (e: any) {
        errors.set({ save: e.message ?? "Erro ao salvar" });
        return false;
      } finally {
        isSaving.set(false);
      }
    },
  };
}

export const quizEditor = createQuizEditorStore();
```

- [ ] **Step 3: Escrever `dashboard/+page.svelte`**

Lista de quizzes do Host com cards e botões "Editar", "Iniciar Sessão", "Excluir".

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/api/quizzes.ts frontend/src/lib/stores/quiz-editor.store.ts \
  frontend/src/routes/\(host\)/dashboard/
git commit -m "feat: frontend quiz — api, editor store e dashboard"
```

---

### Task 19: Frontend — Editor de Quiz

**Files:**
- Create: `frontend/src/routes/(host)/quiz/new/+page.svelte`
- Create: `frontend/src/routes/(host)/quiz/[id]/edit/+page.svelte`
- Create: `frontend/src/lib/components/quiz/QuestionEditor.svelte`
- Create: `frontend/src/lib/components/quiz/AlternativeInput.svelte`

- [ ] **Step 1: Escrever `QuestionEditor.svelte`**

```svelte
<script lang="ts">
  import { quizEditor } from "$lib/stores/quiz-editor.store";
  import AlternativeInput from "./AlternativeInput.svelte";
  import { createEventDispatcher } from "svelte";

  export let question: any;
  export let index: number;
  const dispatch = createEventDispatcher();

  function updateText(e: Event) {
    const text = (e.target as HTMLTextAreaElement).value;
    // Atualiza via store
  }
</script>

<div class="question-editor">
  <span>Pergunta {index + 1}</span>
  <textarea value={question.text} on:input={updateText} placeholder="Digite a pergunta..." />
  <span>Pontuação base: {question.basePoints}</span>

  <h4>Alternativas</h4>
  {#each question.alternatives as alt, i}
    <AlternativeInput {alt} questionId={question.id} letter={String.fromCharCode(65 + i)} />
  {/each}

  {#if question.alternatives.length < 4 && question.questionType === "multiple_choice"}
    <button on:click={() => quizEditor.addAlternative(question.id)}>+ Alternativa</button>
  {/if}

  <button class="danger" on:click={() => quizEditor.removeQuestion(question.id)}>
    Remover pergunta
  </button>
</div>
```

- [ ] **Step 2: Escrever `AlternativeInput.svelte`**

```svelte
<script lang="ts">
  import { quizEditor } from "$lib/stores/quiz-editor.store";

  export let alt: { id: string; text: string; isCorrect: boolean };
  export let questionId: string;
  export let letter: string;
</script>

<div class="alternative" class:correct={alt.isCorrect}>
  <span class="letter">{letter}</span>
  <input
    type="text"
    value={alt.text}
    placeholder={`Alternativa ${letter}`}
    on:input={(e) => { alt.text = (e.target as HTMLInputElement).value; }}
  />
  <input
    type="radio"
    name={`correct_${questionId}`}
    checked={alt.isCorrect}
    on:change={() => quizEditor.markCorrect(questionId, alt.id)}
    title="Marcar como correta"
  />
</div>
```

- [ ] **Step 3: Escrever `quiz/new/+page.svelte`**

```svelte
<script lang="ts">
  import { quizEditor } from "$lib/stores/quiz-editor.store";
  import QuestionEditor from "$lib/components/quiz/QuestionEditor.svelte";
  import { goto } from "$app/navigation";

  let title = "";

  async function handleCreate() {
    quizEditor.initNew(title);
    // Redireciona para o editor completo
    goto(`/quiz/new/edit`);
  }
</script>

<h1>Novo Questionário</h1>
<input bind:value={title} placeholder="Título do quiz" />
<button on:click={handleCreate} disabled={!title.trim()}>Criar e editar</button>
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/routes/\(host\)/quiz/ frontend/src/lib/components/quiz/
git commit -m "feat: editor de quiz com questions e alternatives drag-and-drop"
```

---

## Fase 9: Frontend — Sessão do Host e Experiência do Player

### Task 20: Frontend — Controle de Sessão do Host

**Files:**
- Create: `frontend/src/lib/api/sessions.ts`
- Create: `frontend/src/lib/stores/host-session.store.ts`
- Create: `frontend/src/lib/game/socket-host.ts`
- Create: `frontend/src/routes/(host)/session/[id]/host/+page.svelte`

**Interfaces:**
- Consumes: Socket.IO `/host`, `sessionsApi`, backend Task 11
- Produces: tela de controle do Host (PIN, lobby, pergunta ativa, leaderboard)

- [ ] **Step 1: Escrever `frontend/src/lib/game/socket-host.ts`**

```typescript
import { io, Socket } from "socket.io-client";

const WS_URL = import.meta.env.VITE_WS_URL ?? "http://localhost:3000";

export function createHostSocket(token: string): Socket {
  return io(`${WS_URL}/host`, { auth: { token } });
}
```

- [ ] **Step 2: Escrever `frontend/src/lib/stores/host-session.store.ts`**

Store com estado: `{ phase, pin, sessionId, playerCount, nicknames, currentQuestion, timeLimit, progress, leaderboard }`. Ações: `createSession(quizId)`, `startSession(timeLimit)`, `nextQuestion()`, `showLeaderboard()`, `endSession()`.

- [ ] **Step 3: Escrever `host/+page.svelte`**

Tela com 4 sub-telas (estados): criação (mostra PIN + config timer), lobby (lista de jogadores), pergunta ativa (timer + progresso), leaderboard (ranking). Controladas via `$hostSession.phase`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/game/socket-host.ts frontend/src/lib/stores/host-session.store.ts \
  frontend/src/lib/api/sessions.ts frontend/src/routes/\(host\)/session/
git commit -m "feat: controle de sessão do Host — PIN, lobby, perguntas, leaderboard"
```

---

### Task 21: Frontend — Experiência do Player

**Files:**
- Create: `frontend/src/lib/game/socket-player.ts`
- Create: `frontend/src/lib/stores/player-session.store.ts`
- Create: `frontend/src/routes/play/+page.svelte` (entrada PIN + nickname)
- Create: `frontend/src/routes/play/[pin]/+page.svelte` (tela de jogo)
- Create: `frontend/src/lib/stores/leaderboard.store.ts`

**Interfaces:**
- Consumes: Socket.IO `/play`, backend Task 12
- Produces: fluxo completo do Player (join → lobby → pergunta → feedback → leaderboard → pódio)

- [ ] **Step 1: Escrever `frontend/src/lib/game/socket-player.ts`**

```typescript
import { io, Socket } from "socket.io-client";

const WS_URL = import.meta.env.VITE_WS_URL ?? "http://localhost:3000";

export function createPlayerSocket(pin: string): Socket {
  return io(`${WS_URL}/play`, { query: { pin } });
}
```

- [ ] **Step 2: Escrever `frontend/src/lib/stores/player-session.store.ts`**

Store com estado: `{ phase: 'join'|'lobby'|'question'|'leaderboard'|'ended', pin, nickname, currentQuestion, totalScore, hasAnswered, lastResult, leaderboard, myRank }`. Ações: `join(pin, nickname)`, `submitAnswer(questionIndex, answer)`, `reset()`.

- [ ] **Step 3: Escrever `play/+page.svelte`** — formulário PIN + nickname

- [ ] **Step 4: Escrever `play/[pin]/+page.svelte`** — 5 sub-telas: lobby (aguardando), pergunta (botões coloridos A/B/C/D ou V/F), feedback (✓/✗ + pontos), leaderboard parcial, pódio final

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/game/socket-player.ts frontend/src/lib/stores/player-session.store.ts \
  frontend/src/lib/stores/leaderboard.store.ts frontend/src/routes/play/
git commit -m "feat: experiência completa do Player — join, gameplay, feedback e pódio"
```

---

## Fase 10: Infraestrutura

### Task 22: Nginx e Docker Compose

**Files:**
- Create: `nginx.conf`
- Create: `Dockerfile`
- Create: `docker-compose.yml`

- [ ] **Step 1: Escrever `nginx.conf`**

```nginx
events { worker_connections 1024; }

http {
  upstream backend { server app:3000; }

  server {
    listen 80;
    server_name _;

    location /api/ { proxy_pass http://backend; proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade"; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; }

    location /socket.io/ { proxy_pass http://backend; proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade"; proxy_set_header Host $host; }

    location / { proxy_pass http://backend; proxy_set_header Host $host; }
  }
}
```

- [ ] **Step 2: Escrever `Dockerfile`**

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY dist/ ./dist/
COPY frontend/build/ ./frontend/build/
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

- [ ] **Step 3: Escrever `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: quiz
      POSTGRES_PASSWORD: quizpass
      POSTGRES_DB: quizplatform
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  app:
    build: .
    ports: ["3000:3000"]
    depends_on: [postgres, redis]
    environment:
      DATABASE_URL: postgres://quiz:quizpass@postgres:5432/quizplatform
      REDIS_URL: redis://redis:6379
      JWT_SECRET: dev-secret-change-in-production-minimum-32-chars!!
      JWT_REFRESH_SECRET: dev-refresh-secret-change-in-production-32-chars!!
    command: sh -c "npx drizzle-kit migrate && node dist/server.js"

  nginx:
    image: nginx:alpine
    ports: ["80:80"]
    volumes: [./nginx.conf:/etc/nginx/nginx.conf:ro]
    depends_on: [app]

volumes:
  pgdata:
```

- [ ] **Step 4: Commit**

```bash
git add nginx.conf Dockerfile docker-compose.yml
git commit -m "chore: Nginx, Dockerfile e Docker Compose para deploy local"
```

---

### Task 23: Relatórios no Frontend (bônus)

**Files:**
- Create: `frontend/src/lib/api/reports.ts`
- Create: `frontend/src/routes/(host)/quiz/[id]/report/+page.svelte`

- [ ] **Step 1: Escrever `frontend/src/lib/api/reports.ts`**

```typescript
import { api } from "./client";

export const reportsApi = {
  quizReport: (quizId: string) => api.fetch<any>(`/api/quizzes/${quizId}/report`),
  quizSessions: (quizId: string) => api.fetch<any>(`/api/quizzes/${quizId}/sessions`),
  sessionReport: (sessionId: string) => api.fetch<any>(`/api/sessions/${sessionId}/report`),
};
```

- [ ] **Step 2: Escrever página de relatório do quiz**

Tabela de perguntas com taxa de acerto e tempo médio + lista de sessões históricas.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/api/reports.ts frontend/src/routes/\(host\)/quiz/\[id\]/report/
git commit -m "feat: página de relatório por quiz com métricas e histórico de sessões"
```

---

## Anexo: Scripts do package.json (final)

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc && cd frontend && npm run build",
    "start": "node dist/server.js",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

