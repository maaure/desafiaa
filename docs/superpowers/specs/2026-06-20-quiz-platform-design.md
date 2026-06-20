# SDD — Plataforma Interativa de Quizzes em Tempo Real

**Data:** 2026-06-20
**Status:** Design aprovado
**Stack:** Node.js + TypeScript + Fastify + Socket.IO + Drizzle ORM + PostgreSQL + Redis + SvelteKit

---

## 1. Visão Geral

Plataforma interativa de quizzes em tempo real, no estilo Kahoot!, onde um Apresentador (Host) autenticado cria questionários e conduz sessões ao vivo, enquanto Participantes (Players) anônimos entram via PIN de 6 dígitos usando seus próprios dispositivos.

### Atores

| Ator                  | Autenticação             | Ações principais                                                                                 |
| --------------------- | ------------------------ | ------------------------------------------------------------------------------------------------ |
| Apresentador (Host)   | Email + senha (JWT)      | Criar/editar/excluir quizzes, iniciar sessão, controlar fluxo de perguntas, projetar leaderboard |
| Participante (Player) | Anônimo (PIN + nickname) | Entrar na sessão, responder perguntas, ver pontuação e ranking                                   |

### Requisitos Não-Funcionais

- **Baixa latência:** Comunicação em tempo real via WebSockets (Socket.IO)
- **Escalabilidade:** Suportar até 500 jogadores simultâneos por sessão em uma única instância
- **Tolerância a falhas:** Reconexão automática sem perda de estado ou pontuação
- **Segurança:** PIN randômico, rate limiting, gabarito nunca exposto ao cliente

### Princípios de Design de Código (ordem de prioridade)

1. **KISS** — Soluções simples primeiro: função pura > classe > abstração
2. **DRY** — Extrair repetição quando dói, não prematuramente
3. **SOLID com moderação** — SRP e DIP são bem-vindos; ISP e LSP apenas quando o problema pedir
4. **MVVM no frontend** — View nunca chama API; ViewModel nunca importa componente; Model é função pura

---

## 2. Arquitetura de Alto Nível

```
┌─────────────────────────────────────────────────────────┐
│                     Nginx (Reverse Proxy)                │
│              SSL Termination / WebSocket Upgrade         │
└────────┬──────────────┬──────────────┬──────────────────┘
         │              │              │
    REST API      WebSocket        Static Files
    (/api/*)      (Socket.IO)      (SvelteKit build)
         │              │              │
         ▼              ▼              ▼
┌─────────────────────────────────────────────────────────┐
│              Node.js + TypeScript (Monolith)             │
│                                                         │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ REST API │  │  WebSocket   │  │  SvelteKit SSR    │  │
│  │ (Auth,   │  │  Gateway     │  │  (opcional, para  │  │
│  │  Quiz    │  │  (Gameplay,  │  │   SEO/meta tags)  │  │
│  │  CRUD)   │  │  Lobby, etc) │  │                   │  │
│  └────┬─────┘  └──────┬───────┘  └───────────────────┘  │
│       │               │                                 │
│  ┌────┴───────────────┴─────────────────────────────┐   │
│  │              Service Layer                        │   │
│  │  ┌──────────┐ ┌───────────┐ ┌────────────────┐   │   │
│  │  │ Session  │ │ Scoring   │ │ Quiz Manager   │   │   │
│  │  │ Manager  │ │ Engine    │ │ (CRUD + PIN)   │   │   │
│  │  └──────────┘ └───────────┘ └────────────────┘   │   │
│  └──────────────────────────────────────────────────┘   │
└────────┬──────────────────────────────┬────────────────┘
         │                              │
         ▼                              ▼
┌─────────────────┐          ┌─────────────────────┐
│   PostgreSQL     │          │       Redis          │
│                  │          │                      │
│ • users          │          │ • active_sessions    │
│ • quizzes        │          │ • session:{id}:*     │
│ • questions      │          │ • pin_lookup         │
│ • alternatives   │          │ • rate_limiting      │
│ • game_history   │          │ • player_scores:*    │
└─────────────────┘          └──────────────────────┘
```

### Componentes

| Componente                        | Responsabilidade                                                                          |
| --------------------------------- | ----------------------------------------------------------------------------------------- |
| **Nginx**                         | Termina SSL, faz upgrade de WebSocket, serve estáticos, proxy reverso                     |
| **REST API (Fastify)**            | Autenticação, CRUD de quizzes/perguntas/alternativas, relatórios                          |
| **WebSocket Gateway (Socket.IO)** | Comunicação em tempo real: lobby, gameplay, leaderboard, reconexão                        |
| **Session Manager**               | Ciclo de vida da sessão: cria PIN, controla estados (lobby → playing → finished)          |
| **Scoring Engine**                | Calcula pontuação: `base_points × (1 - response_ms / time_limit_ms) × accuracy`           |
| **Quiz Manager**                  | CRUD de questionários, geração de PINs únicos, validação de sessão                        |
| **PostgreSQL**                    | Dados persistentes: usuários, quizzes, histórico de partidas, respostas                   |
| **Redis**                         | Estado efêmero de alta velocidade: sessões ativas, lobby, pontuações, leaderboard ao vivo |

### Fluxo de uma Partida

```
Host                Backend               Redis              Players
 │                     │                    │                    │
 │── POST /sessions ──►│                    │                    │
 │                     │── gerar PIN ──────►│                    │
 │                     │── criar sessão ───►│                    │
 │◄── { pin: 482916 }──│                    │                    │
 │                     │                    │                    │
 │                     │◄── join(pin,nick) ────────────────────│
 │                     │── validar PIN ────►│                    │
 │                     │── add ao lobby ───►│                    │
 │                     │── broadcast lobby ───────────────────►│
 │                     │                    │                    │
 │── next question ───►│                    │                    │
 │                     │── get question ───►│ (cached)           │
 │                     │── broadcast q ────────────────────────►│
 │                     │                    │                    │
 │                     │◄── answer(id,ms) ─────────────────────│
 │                     │── score + store ──►│                    │
 │                     │                    │                    │
 │── show leaderboard─►│                    │                    │
 │                     │── compute rank ───►│                    │
 │                     │── broadcast rank ─────────────────────►│
```

---

## 3. Decisões de Tecnologia

| Camada                     | Escolha                       | Justificativa                                                                |
| -------------------------- | ----------------------------- | ---------------------------------------------------------------------------- |
| **Backend**                | Node.js + TypeScript          | Ecossistema Socket.IO maduro, tipagem estática, mesmo runtime do frontend    |
| **Framework HTTP**         | Fastify                       | Performance 2x superior ao Express, schema validation nativo, plugins        |
| **WebSocket**              | Socket.IO                     | Auto-reconexão embutida, rooms nativas, fallback long-polling, Redis adapter |
| **ORM**                    | Drizzle ORM                   | Type-safe, leve, sem codegen, SQL-like queries, migrações nativas            |
| **Frontend**               | SvelteKit                     | Bundle ~2KB runtime, reatividade compilada, adapters para Node.js            |
| **Banco de Dados**         | PostgreSQL 16                 | Integridade referencial, constraints, window functions para rankings         |
| **Cache / Estado Efêmero** | Redis 7                       | Pub/Sub para mensageria, TTL nativo, sorted sets para leaderboard            |
| **Proxy Reverso**          | Nginx                         | Upgrade de WebSocket nativo, SSL via Certbot, rate limiting, gzip            |
| **Autenticação**           | JWT (access + refresh tokens) | Stateless, refresh token em httpOnly cookie                                  |
| **Validação**              | Zod                           | Validação de input na API, DTOs compartilhados, inferência de tipos          |

### Por que não outras escolhas

| Alternativa             | Motivo da recusa                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------- |
| Express                 | Fastify ~2x mais rápido, schema validation built-in                                |
| Prisma ORM              | Mais pesado, codegen obrigatório, performance inferior em queries complexas        |
| WS puro (sem Socket.IO) | Sem auto-reconexão, sem rooms nativas, sem fallback HTTP                           |
| MongoDB                 | Quizzes têm estrutura rigidamente relacional (quiz → N perguntas → M alternativas) |

### Estratégia Socket.IO

- **Rooms como mecânica de sessão:** Cada sessão é uma room `session:<pin>`. Host emite, servidor faz broadcast para Players na room.
- **Redis Adapter para escala futura:** `@socket.io/redis-adapter` faz eventos de uma instância chegarem a sockets em outra via Redis Pub/Sub.
- **Auto-reconexão com restauração de estado:** Retry exponencial com backoff. Player reconecta automaticamente; servidor restaura estado do Redis.

---

## 4. Modelo de Dados

### Schema Drizzle ORM (fonte da verdade — migrations geradas a partir deste código)

```typescript
// db/schema.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  uniqueIndex,
  index,
  check,
  foreignKey,
} from "drizzle-orm/pg-core";

// ═══ USUÁRIOS ═══
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ═══ QUIZZES (questionários — templates reaproveitáveis) ═══
export const quizzes = pgTable(
  "quizzes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authorId: uuid("author_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    isPublished: boolean("is_published").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("idx_quizzes_author").on(t.authorId)],
);

// ═══ PERGUNTAS ═══
export const questions = pgTable(
  "questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    quizId: uuid("quiz_id")
      .references(() => quizzes.id, { onDelete: "cascade" })
      .notNull(),
    text: text("text").notNull(),
    questionType: varchar("question_type", { length: 20 }).notNull(),
    basePoints: integer("base_points").default(1000).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("idx_questions_quiz").on(t.quizId, t.sortOrder),
    check(
      "chk_question_type",
      inArray(t.questionType, ["multiple_choice", "true_false"]),
    ),
    check("chk_base_points", sql`${t.basePoints} > 0`),
  ],
);

// ═══ ALTERNATIVAS ═══
export const alternatives = pgTable(
  "alternatives",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    questionId: uuid("question_id")
      .references(() => questions.id, { onDelete: "cascade" })
      .notNull(),
    text: text("text").notNull(),
    isCorrect: boolean("is_correct").default(false).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
  },
  (t) => [index("idx_alternatives_question").on(t.questionId)],
);

// ═══ SESSÕES DE JOGO (uma "aplicação" do questionário) ═══
export const gameSessions = pgTable(
  "game_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    quizId: uuid("quiz_id")
      .references(() => quizzes.id)
      .notNull(),
    hostId: uuid("host_id")
      .references(() => users.id)
      .notNull(),
    pin: varchar("pin", { length: 6 }).notNull(),
    status: varchar("status", { length: 20 }).notNull(),
    timeLimitSeconds: integer("time_limit_seconds").default(30).notNull(),
    playerCount: integer("player_count").default(0).notNull(),
    maxPlayers: integer("max_players").default(500).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("idx_sessions_quiz").on(t.quizId),
    uniqueIndex("idx_active_pin")
      .on(t.pin)
      .where(sql`${t.status} != 'finished'`),
    check(
      "chk_session_status",
      inArray(t.status, ["lobby", "playing", "finished"]),
    ),
    check("chk_time_limit", sql`${t.timeLimitSeconds} BETWEEN 5 AND 300`),
  ],
);

// ═══ RESPOSTAS INDIVIDUAIS (para relatórios) ═══
export const playerAnswers = pgTable(
  "player_answers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .references(() => gameSessions.id, { onDelete: "cascade" })
      .notNull(),
    questionId: uuid("question_id")
      .references(() => questions.id)
      .notNull(),
    playerNickname: varchar("player_nickname", { length: 50 }).notNull(),
    selectedAnswer: varchar("selected_answer", { length: 1 }).notNull(),
    isCorrect: boolean("is_correct").notNull(),
    responseMs: integer("response_ms").notNull(),
    pointsEarned: integer("points_earned").default(0).notNull(),
    answeredAt: timestamp("answered_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("idx_answers_session").on(t.sessionId),
    index("idx_answers_question").on(t.questionId),
  ],
);

// ═══ RESULTADOS FINAIS ═══
export const gameResults = pgTable(
  "game_results",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .references(() => gameSessions.id, { onDelete: "cascade" })
      .notNull(),
    playerNickname: varchar("player_nickname", { length: 50 }).notNull(),
    totalScore: integer("total_score").default(0).notNull(),
    correctCount: integer("correct_count").default(0).notNull(),
    totalCount: integer("total_count").default(0).notNull(),
    avgResponseMs: integer("avg_response_ms").default(0).notNull(),
    rank: integer("rank").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("idx_results_session").on(t.sessionId, t.rank)],
);

// ═══ RELAÇÕES (queries type-safe) ═══
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
  question: one(questions, {
    fields: [alternatives.questionId],
    references: [questions.id],
  }),
}));

export const gameSessionsRelations = relations(
  gameSessions,
  ({ one, many }) => ({
    quiz: one(quizzes, {
      fields: [gameSessions.quizId],
      references: [quizzes.id],
    }),
    host: one(users, { fields: [gameSessions.hostId], references: [users.id] }),
    answers: many(playerAnswers),
    results: many(gameResults),
  }),
);

export const playerAnswersRelations = relations(playerAnswers, ({ one }) => ({
  session: one(gameSessions, {
    fields: [playerAnswers.sessionId],
    references: [gameSessions.id],
  }),
  question: one(questions, {
    fields: [playerAnswers.questionId],
    references: [questions.id],
  }),
}));

export const gameResultsRelations = relations(gameResults, ({ one }) => ({
  session: one(gameSessions, {
    fields: [gameResults.sessionId],
    references: [gameSessions.id],
  }),
}));
```

### Redis — Chaves e Estruturas

```
pin:<pin>:status       → "lobby" | "playing" | "finished"
pin:<pin>:config       → { quiz_id, time_limit_seconds, current_question_index }
pin:<pin>:players      → Set de socket_ids
pin:<pin>:player:<sid> → { nickname, total_score }
pin:<pin>:scores       → Sorted Set { socket_id: score } — leaderboard em O(log N)
pin:<pin>:answers:q:<n> → Hash { player_nickname → { answer, response_ms, points } } (TTL 5min)
pin:lookup:<pin>       → session_id UUID (TTL 24h)
```

### Fórmula de Pontuação

```
score = base_points × (1 - response_time_ms / time_limit_ms) × accuracy

Onde:
  base_points = definido na pergunta (padrão 1000)
  response_time_ms = ms entre pergunta revelada e resposta do jogador
  time_limit_ms = configurado na sessão (padrão 30s = 30000ms)
  accuracy = 1.0 se correta, 0.0 se errada

Exemplos com time_limit de 30s e base_points 1000:
  Acertar em 1s  → 1000 × (1 − 1000/30000) × 1.0 = 967 pontos
  Acertar em 29s → 1000 × (1 − 29000/30000) × 1.0 = 33 pontos
  Errar         → 0 pontos
```

---

## 5. Protocolo de Comunicação WebSocket

Dois namespaces Socket.IO:

| Namespace | Quem conecta                             | Propósito            |
| --------- | ---------------------------------------- | -------------------- |
| `/host`   | Apresentador (autenticado via JWT)       | Controla a sessão    |
| `/play`   | Participante (anônimo, validado por PIN) | Joga e vê resultados |

### Eventos — Namespace `/host`

| Evento                  | Direção    | Descrição                                                           |
| ----------------------- | ---------- | ------------------------------------------------------------------- |
| `host:session:create`   | Host → Svr | Inicia novo jogo. Payload: `{ quizId }`                             |
| `host:session:start`    | Host → Svr | Abre lobby. Payload: `{ timeLimitSeconds }`                         |
| `host:question:next`    | Host → Svr | Avança para próxima pergunta                                        |
| `host:leaderboard:show` | Host → Svr | Exibe ranking atual                                                 |
| `host:session:end`      | Host → Svr | Encerra a partida                                                   |
| `session:created`       | Svr → Host | PIN gerado. Payload: `{ pin, sessionId }`                           |
| `player:joined`         | Svr → Host | Notifica novo player no lobby. Payload: `{ nickname, playerCount }` |
| `host:question:active`  | Svr → Host | Confirma pergunta ativa. Payload: `{ questionIndex, total }`        |
| `host:answers:progress` | Svr → Host | Progresso de respostas. Payload: `{ answered, total }`              |
| `host:session:ended`    | Svr → Host | Partida encerrada. Payload: `{ sessionId, playerCount }`            |

### Eventos — Namespace `/play`

| Evento                  | Direção       | Descrição                                                                                   |
| ----------------------- | ------------- | ------------------------------------------------------------------------------------------- |
| `player:join`           | Player → Svr  | Entra na sessão. Payload: `{ pin, nickname }`                                               |
| `player:answer`         | Player → Svr  | Envia resposta. Payload: `{ questionIndex, answer }`                                        |
| `player:joined`         | Svr → Player  | Confirma entrada. Payload: `{ sessionId, totalPlayers }`                                    |
| `player:lobby:update`   | Svr → Todos   | Atualiza contagem do lobby. Payload: `{ playerCount, nicknames }`                           |
| `game:question:show`    | Svr → Players | Revela pergunta (sem gabarito). Payload: `{ questionIndex, text, timeLimit, alternatives }` |
| `player:answer:ack`     | Svr → Player  | Confirma resposta individual. Payload: `{ isCorrect, pointsEarned, totalScore }`            |
| `game:question:timeout` | Svr → Players | Tempo esgotado. Payload: `{ correctAnswer }`                                                |
| `game:leaderboard:show` | Svr → Players | Ranking entre perguntas. Payload: `{ rankings, myRank }`                                    |
| `game:ended`            | Svr → Players | Pódio final. Payload: `{ finalRankings, yourRank, totalPlayers }`                           |

### Reconexão com Estado

- Socket.IO retry exponencial com backoff automático
- Ao reconectar no `/play`, servidor busca estado no Redis pela chave `pin:<pin>:player:<old_sid>`
- Novo socketId atualizado no Set de players
- Player re-join na room `session:<pin>`
- Servidor emite `player:reconnected` com `{ state, currentQuestion, totalScore, hasAnswered }`
- Cliente restaura tela conforme estado: mostra pergunta atual, feedback se já respondeu, ou pódio se acabou

---

## 6. Rotas REST

### Autenticação

| Método | Rota                 | Auth   | Descrição                                                                        |
| ------ | -------------------- | ------ | -------------------------------------------------------------------------------- |
| `POST` | `/api/auth/register` | ❌     | Registro: `{ name, email, password }` → `{ user, accessToken }` + refresh cookie |
| `POST` | `/api/auth/login`    | ❌     | Login: `{ email, password }` → `{ user, accessToken }` + refresh cookie          |
| `POST` | `/api/auth/refresh`  | cookie | Renova access token                                                              |
| `POST` | `/api/auth/logout`   | cookie | Limpa refresh cookie                                                             |

### Quizzes (Questionários)

| Método   | Rota               | Auth | Descrição                                  |
| -------- | ------------------ | ---- | ------------------------------------------ |
| `GET`    | `/api/quizzes`     | ✅   | Lista quizzes do autor (paginado)          |
| `GET`    | `/api/quizzes/:id` | ✅   | Quiz completo com perguntas e alternativas |
| `POST`   | `/api/quizzes`     | ✅   | Cria novo quiz                             |
| `PUT`    | `/api/quizzes/:id` | ✅   | Edita quiz (só autor)                      |
| `DELETE` | `/api/quizzes/:id` | ✅   | Remove quiz (só autor)                     |

### Perguntas

| Método   | Rota                         | Auth | Descrição         |
| -------- | ---------------------------- | ---- | ----------------- |
| `POST`   | `/api/quizzes/:id/questions` | ✅   | Adiciona pergunta |
| `PUT`    | `/api/questions/:id`         | ✅   | Edita pergunta    |
| `DELETE` | `/api/questions/:id`         | ✅   | Remove pergunta   |
| `PUT`    | `/api/questions/:id/order`   | ✅   | Reordena pergunta |

### Alternativas

| Método   | Rota                              | Auth | Descrição            |
| -------- | --------------------------------- | ---- | -------------------- |
| `POST`   | `/api/questions/:id/alternatives` | ✅   | Adiciona alternativa |
| `PUT`    | `/api/alternatives/:id`           | ✅   | Edita alternativa    |
| `DELETE` | `/api/alternatives/:id`           | ✅   | Remove alternativa   |
| `PUT`    | `/api/alternatives/:id/correct`   | ✅   | Marca como correta   |

### Sessões

| Método | Rota                        | Auth | Descrição                            |
| ------ | --------------------------- | ---- | ------------------------------------ |
| `POST` | `/api/sessions`             | ✅   | Cria sessão `{ quizId }` → gera PIN  |
| `GET`  | `/api/sessions/:id`         | ✅   | Detalhes da sessão (Host)            |
| `GET`  | `/api/sessions/join/:pin`   | ❌   | Verifica PIN válido (Player anônimo) |
| `GET`  | `/api/sessions/:id/results` | ✅   | Resultados finais                    |

### Relatórios

| Método | Rota                        | Auth | Descrição                         |
| ------ | --------------------------- | ---- | --------------------------------- |
| `GET`  | `/api/quizzes/:id/report`   | ✅   | Desempenho agregado por pergunta  |
| `GET`  | `/api/sessions/:id/report`  | ✅   | Relatório detalhado de uma sessão |
| `GET`  | `/api/quizzes/:id/sessions` | ✅   | Histórico de sessões daquele quiz |

---

## 7. Estrutura de Diretórios

### Backend

```
src/
├── server.ts                  # Bootstrap: Fastify + Socket.IO + Redis
├── config/
│   └── env.ts                 # Tipagem de variáveis de ambiente (Zod)
├── db/
│   ├── schema.ts              # Schema Drizzle (fonte da verdade)
│   ├── migrations/            # Gerado pelo drizzle-kit
│   └── index.ts               # Conexão PostgreSQL + Drizzle client
├── redis/
│   ├── client.ts              # Conexão Redis (ioredis)
│   └── keys.ts                # Fábrica de chaves (pin:<pin>:scores etc)
├── modules/
│   ├── auth/
│   │   ├── auth.routes.ts     # Rotas Fastify
│   │   ├── auth.service.ts    # Lógica: hash, JWT, refresh
│   │   └── auth.schema.ts     # Schemas Zod (input/output)
│   ├── quiz/
│   │   ├── quiz.routes.ts
│   │   ├── quiz.service.ts
│   │   └── quiz.schema.ts
│   ├── session/
│   │   ├── session.routes.ts
│   │   ├── session.service.ts
│   │   ├── session.gateway.ts # Lógica WebSocket (Host namespace)
│   │   └── session.schema.ts
│   ├── gameplay/
│   │   ├── gameplay.gateway.ts# Lógica WebSocket (Play namespace)
│   │   ├── scoring.service.ts # Engine de pontuação
│   │   └── leaderboard.service.ts # Ranking via Redis sorted sets
│   └── report/
│       ├── report.routes.ts
│       └── report.service.ts
├── middleware/
│   ├── auth.ts                # JWT verify → req.user
│   └── error-handler.ts       # Formata erros (Zod, HTTP, genérico)
└── shared/
    ├── errors.ts              # AppError, NotFoundError, UnauthorizedError
    └── pagination.ts          # Helper de paginação
```

### Frontend (SvelteKit + MVVM)

```
src/
├── app.html
├── app.css
├── lib/
│   ├── api/                   # ★ Model (camada de dados)
│   │   ├── client.ts          #   fetch wrapper + Socket.IO client
│   │   ├── auth.ts            #   login, register, refresh, logout
│   │   ├── quizzes.ts         #   CRUD quizzes + perguntas + alternativas
│   │   ├── sessions.ts        #   criar sessão, verificar PIN
│   │   └── reports.ts         #   buscar dados de relatório
│   │
│   ├── stores/                # ★ ViewModel (estado + lógica)
│   │   ├── auth.store.ts      #   user, isAuthenticated, login(), logout()
│   │   ├── quiz-editor.store.ts  # quiz sendo editado, addQuestion(), reorder()
│   │   ├── host-session.store.ts # sessão ativa, pin, playerCount, controls
│   │   ├── player-session.store.ts # estado do jogo, score, respondeu?
│   │   └── leaderboard.store.ts   # rankings, posição atual
│   │
│   ├── components/            # ★ View (componentes)
│   │   ├── ui/                #   Button, Input, Card, Badge, Modal, Timer
│   │   ├── quiz/              #   QuizCard, QuestionEditor, AlternativeInput
│   │   ├── host/              #   LobbyScreen, QuestionReveal, LeaderboardHost
│   │   ├── player/            #   JoinScreen, AnswerButtons, LeaderboardPlayer
│   │   └── shared/            #   ProgressBar, Avatar, EmptyState
│   │
│   ├── game/                  # ★ Game engine (client-side Socket.IO)
│   │   ├── socket-host.ts     #   Socket.IO /host namespace
│   │   └── socket-player.ts   #   Socket.IO /play namespace
│   │
│   └── types/                 #   Tipos compartilhados
│       ├── quiz.ts            #   Quiz, Question, Alternative
│       ├── session.ts         #   GameSession, PlayerState, LeaderboardEntry
│       └── events.ts          #   Tipos de eventos WS
│
├── routes/
│   ├── (public)/              #   Layout público
│   │   ├── login/+page.svelte
│   │   └── register/+page.svelte
│   ├── (host)/                #   Layout autenticado (Host)
│   │   ├── +layout.svelte     #   Navbar + auth guard
│   │   ├── dashboard/+page.svelte
│   │   ├── quiz/[id]/edit/+page.svelte
│   │   ├── quiz/[id]/report/+page.svelte
│   │   ├── quiz/new/+page.svelte
│   │   └── session/[id]/host/+page.svelte
│   └── play/                  #   Rota anônima (Player)
│       ├── +page.svelte       #   Tela de entrada (PIN + nickname)
│       └── [pin]/+page.svelte #   Tela de jogo
```

### Princípios na Estrutura

| Princípio | Como se manifesta                                                                                                                              |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **KISS**  | Cada módulo tem no máximo 4 arquivos. Service depende direto do Drizzle e Redis — sem repositórios, interfaces ou DI containers.               |
| **DRY**   | `client.ts` unifica fetch wrapper. Stores de socket compartilham setup via `createSocket(namespace)`. Componentes UI são átomos reutilizáveis. |
| **SRP**   | `player-session.store` não sabe que `leaderboard.store` existe. Cada store tem uma responsabilidade.                                           |
| **DIP**   | Componente depende da store (abstração), não da API (implementação). Trocar REST = trocar `lib/api`, componentes intactos.                     |
| **MVVM**  | View nunca chama fetch/WebSocket direto. ViewModel nunca importa `.svelte`. Model é função pura.                                               |

---

## 8. Segurança, Rate Limiting e Tratamento de Erros

### Segurança

| Camada                                                          | O que protege           |
| --------------------------------------------------------------- | ----------------------- |
| bcrypt (12 rounds)                                              | Senhas no banco         |
| JWT (15min) + refresh cookie (7d, httpOnly, secure, sameSite)   | Autenticação do Host    |
| PIN randômico (crypto.randomInt) 6 dígitos                      | Acesso à sessão de jogo |
| Validação de PIN no handshake do Socket.IO `/play`              | Conexão WebSocket       |
| Alternativas SEM `isCorrect` enviadas ao cliente                | Integridade do jogo     |
| Resposta correta só após timeout/todos responderem              | Anti-trapaça            |
| Quiz com gabarito só para autor autenticado                     | Proteção de conteúdo    |
| Erro genérico no 500xx (sem stack trace)                        | Anti-vazamento          |
| ViewModel como barreira de erro (componente nunca vê try/catch) | UX + segurança          |

### Rate Limiting

| Alvo                      | Limite                    | Ferramenta                          |
| ------------------------- | ------------------------- | ----------------------------------- |
| `/api/auth/*`             | 5 req/min por IP          | `@fastify/rate-limit` (Redis store) |
| `/api/sessions/join/:pin` | 30 req/10s por IP         | `@fastify/rate-limit`               |
| Socket.IO `/play` connect | 10 conexões/5s por IP     | Middleware custom                   |
| Socket.IO `player:answer` | 1 por pergunta por socket | Gate no gateway                     |
| REST autenticado          | 100 req/min por user      | `@fastify/rate-limit`               |

### Tratamento de Erros

Três classes cobrem todos os casos:

```typescript
// shared/errors.ts
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

Middleware único de erro no Fastify formata AppError, ZodError e erros inesperados (500 genérico). No frontend, apenas as stores (ViewModel) contêm try/catch — componentes apenas leem `$store.error` e renderizam.

---

## 9. Conceito de Questionário como Template

```
┌─────────────────────────────────────────────────────┐
│  Quiz "Revolução Francesa" (criado uma vez)          │
│  ├── Pergunta 1: "Em que ano começou?"              │
│  │   ├── A: 1789 ✓          base_points: 1000       │
│  │   ├── B: 1776                                      │
│  │   ├── C: 1804                                      │
│  │   └── D: 1815                                      │
│  ├── Pergunta 2: "Quem era o rei?"                  │
│  │   └── ...                                         │
│  └── ... (N perguntas)                               │
│                                                      │
│  ▼▼▼ REUTILIZADO EM MÚLTIPLAS SESSÕES ▼▼▼           │
│                                                      │
│  Sessão A (Turma 8ºA)   Sessão B (Turma 8ºB)         │
│  PIN: 482916             PIN: 739105                 │
│  Timer: 20s              Timer: 45s                  │
│  Data: 2026-06-20        Data: 2026-06-21            │
│  Jogadores: 32           Jogadores: 28               │
│                                                      │
│  └── player_answers (respostas individuais)          │
│  └── game_results (ranking final)                    │
│      ↑                                               │
│      Esses dados alimentam relatórios:               │
│      • Taxa de acerto por pergunta                   │
│      • Tempo médio de resposta por pergunta           │
│      • Evolução do desempenho entre sessões           │
│      • Questões mais difíceis (ranking de erros)      │
└─────────────────────────────────────────────────────┘
```

---

## 10. Stack Tecnológica — Resumo Final

| Camada         | Tecnologia                                           |
| -------------- | ---------------------------------------------------- |
| Runtime        | Node.js 22 + TypeScript 5.x                          |
| HTTP Framework | Fastify 5.x                                          |
| WebSocket      | Socket.IO 4.x + `@socket.io/redis-adapter`           |
| ORM            | Drizzle ORM + `drizzle-kit` (migrations)             |
| Database       | PostgreSQL 16                                        |
| Cache / Estado | Redis 7 (ioredis)                                    |
| Frontend       | SvelteKit 2.x                                        |
| Reverse Proxy  | Nginx + Certbot (SSL)                                |
| Validação      | Zod                                                  |
| Autenticação   | bcrypt + JWT (access + refresh tokens)               |
| Hospedagem     | VPS (Docker Compose: app + postgres + redis + nginx) |
