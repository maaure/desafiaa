# Quiz Platform — Plataforma Interativa de Quizzes em Tempo Real

Plataforma de quizzes ao vivo no estilo Kahoot!. Apresentadores autenticados criam questionários e conduzem partidas; Participantes anônimos entram via código de acesso (PIN) de 6 dígitos e respondem em tempo real.

## Documentos de Referência

Antes de qualquer implementação, leia ao menos a seção relevante destes documentos. Eles são a fonte da verdade sobre o que construir e como.

| Documento                                                   | Conteúdo                                                            | Quando consultar                 |
| ----------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------- |
| `docs/business/doc-visao.md`                                | Requisitos, regras de negócio, critérios de aceitação, glossário    | Entender **o que** e **por quê** |
| `docs/superpowers/specs/2026-06-20-quiz-platform-design.md` | Arquitetura, modelo de dados, protocolo WebSocket, rotas, segurança | Entender **como** implementar    |

## Stack

| Camada                 | Tecnologia                              |
| ---------------------- | --------------------------------------- |
| Runtime                | Node.js 22 + TypeScript 5.x             |
| HTTP                   | Fastify 5.x                             |
| WebSocket              | Socket.IO 4.x                           |
| ORM                    | Drizzle ORM (schema TS gera migrations) |
| Banco                  | PostgreSQL 16                           |
| Cache / Estado ao vivo | Redis 7                                 |
| Frontend               | SvelteKit 2.x                           |
| Proxy                  | Nginx + Certbot                         |
| Validação              | Zod                                     |

## Domínio — Linguagem de Negócio

Use estes termos consistentemente em TODO o projeto: nomes de arquivos, funções, variáveis, stores, eventos e mensagens de commit.

| Termo de negócio  | Termo técnico (código)         | Significado                                                    |
| ----------------- | ------------------------------ | -------------------------------------------------------------- |
| Apresentador      | `Host` ou `host`               | Usuário autenticado que cria questionários e conduz partidas   |
| Participante      | `Player` ou `player`           | Usuário anônimo que entra via PIN e responde perguntas         |
| Questionário      | `Quiz` ou `quiz`               | Template de perguntas, reutilizável em várias partidas         |
| Pergunta          | `Question` ou `question`       | Item individual dentro de um questionário                      |
| Opção de resposta | `Alternative` ou `alternative` | Cada opção (A, B, C, D ou Verdadeiro/Falso)                    |
| Partida           | `Session` ou `session`         | Uma aplicação de um questionário com PIN, data e participantes |
| Código de acesso  | `PIN` ou `pin`                 | 6 dígitos numéricos que identificam uma partida                |
| Apelido           | `nickname`                     | Nome escolhido pelo Participante ao entrar na partida          |
| Classificação     | `Leaderboard` ou `leaderboard` | Ranking dos Participantes por pontuação                        |
| Pontuação         | `Score` ou `score`             | Pontos obtidos por resposta                                    |

**Regra:** documentação e interfaces de usuário usam os termos em português. Código usa os termos técnicos em inglês. Não misture — ou escreva em português (documentos, mensagens ao usuário) ou em inglês (código, commits).

## Princípios de Design — Ordem de Prioridade

Estes princípios regem TODA decisão de código no projeto. Quando dois princípios conflitarem, o de cima vence.

### 1. KISS (Keep It Simple, Stupid)

A solução mais simples que funciona é a correta.

```
Função pura > classe com método > classe abstrata > interface + implementação > DI container
```

- Um módulo tem no máximo 6 arquivos (`routes`, `service`, `repository`, `types`, `schema`, `gateway` opcional)
- **Repository** é uma camada fina de acesso a dados: encapsula queries do Drizzle e operações do Redis. O service **não** chama Drizzle/Redis direto — chama o repository. Repository não contém lógica de negócio, apenas queries.
- **Types** declara as interfaces e tipos TypeScript do módulo (entrada, saída, entidades). Fica em arquivo separado (`*.types.ts`) para evitar acúmulo de definições no service ou schema.
- Service depende do repository e concentra a lógica de negócio. **Não crie interfaces, classes abstratas ou DI containers** — o service importa o repository diretamente como um objeto concreto.
- Se uma função pura resolve, não crie uma classe
- Se um `if` resolve, não crie uma strategy pattern
- Não antecipe abstrações para cenários que não existem hoje (YAGNI)

### 2. DRY (Don't Repeat Yourself)

Extraia repetição somente quando ela dói — nunca prematuramente.

- Duas ocorrências iguais: **deixe como está**, pode ser coincidência
- Três ocorrências iguais: **considere** extrair se o trecho for idêntico e estável
- Quatro ou mais: **extraia** para uma função ou componente compartilhado

**Ao extrair, mantenha KISS:** um helper em `shared/` ou um componente em `components/ui/` é suficiente. Não crie uma camada de abstração só para eliminar duplicação.

### 3. SOLID com Moderação

Aplique apenas os princípios que melhoram a clareza do código agora.

| Princípio                       | Aplicar?       | Quando                                                                                                  |
| ------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------- |
| **SRP** (Single Responsibility) | ✅ Sempre      | Cada módulo/store/função faz uma coisa. `player-session.store` não sabe que `leaderboard.store` existe. |
| **DIP** (Dependency Inversion)  | ✅ Sempre      | Componente depende de store (abstração), não de API (implementação). Trocar REST → store intacta.       |
| **OCP** (Open/Closed)           | ⚠️ Quando doer | Só se houver necessidade real de extensão sem modificação.                                              |
| **LSP** (Liskov Substitution)   | ⚠️ Quando doer | Só aplique se houver hierarquia de classes com subtipos.                                                |
| **ISP** (Interface Segregation) | ⚠️ Quando doer | Só aplique se houver interfaces com múltiplos consumidores distintos.                                   |

### 4. MVVM (Frontend)

O frontend segue MVVM como estrutura obrigatória. Três camadas, cada uma com responsabilidades e restrições claras.

```
View (components/)  →  ViewModel (stores/)  →  Model (api/)
     │                       │                      │
     │  lê estado            │                      │
     │──────────────────────►│                      │
     │                       │── chama API ────────►│
     │                       │◄── dados ───────────│
     │◄── reativo ──────────│                      │
     │                       │                      │
     │── dispara ação ──────►│                      │
```

**Regras imutáveis:**

- **View (componente `.svelte`):** renderiza HTML, lê stores (`$store`), dispara ações da store. **Nunca** chama `fetch`, `socket.emit` ou qualquer API diretamente. **Nunca** contém `try/catch` — erro vem da store. **Nunca** importa ou chama funções do model (`api/`) — use sempre queries, mutations ou ações da store.
- **ViewModel (store):** detém estado (`writable`/`derived`), expõe ações (`login()`, `submitAnswer()`), contém TODO `try/catch` e TODO `socket.on(...)`. **Nunca** importa `.svelte`. **Nunca** manipula DOM.
- **Model (`api/` e `game/`):** funções puras que chamam endpoints REST ou configuram sockets. Retornam dados tipados. **Nunca** importam stores ou componentes. Toda chamada REST deve ser exposta via TanStack Query — `createQuery` para leitura, `createMutation` para escrita. Nenhuma página ou componente chama funções do model diretamente; o consumo é sempre via queries e mutations.

**Exemplo correto de separação:**

```typescript
// ❌ ERRADO — componente chamando API direto
async function handleLogin() {
  const res = await fetch('/api/auth/login', { ... });  // NUNCA faça isso
}

// ✅ CORRETO — componente consome store
async function handleLogin() {
  const ok = await auth.login(email, password);  // auth é a store
  if (ok) goto('/dashboard');
  // $auth.error já contém erro se houve falha
}
```

## Estrutura de Diretórios

Esta estrutura reflete os princípios acima. Respeite-a ao criar novos arquivos.

### Backend (`backend/src/`)

```
backend/src/
├── server.ts                  # Bootstrap: Fastify + Socket.IO + Redis
├── config/
│   └── env.ts                 # Variáveis de ambiente tipadas (Zod)
├── db/
│   ├── schema.ts              # Schema Drizzle — FONTE DA VERDADE
│   ├── migrations/            # Gerado por drizzle-kit (nunca edite manualmente)
│   └── index.ts               # Conexão PostgreSQL + Drizzle client
├── redis/
│   ├── client.ts              # Conexão Redis (ioredis)
│   └── keys.ts                # Fábrica de chaves Redis
├── modules/
│   ├── auth/                  # auth.routes.ts, auth.service.ts, auth.repository.ts, auth.schema.ts, auth.types.ts
│   ├── quiz/                  # quiz.routes.ts, quiz.service.ts, quiz.repository.ts, quiz.schema.ts, quiz.types.ts
│   ├── session/               # session.routes.ts, session.service.ts, session.repository.ts, session.gateway.ts, session.schema.ts, session.types.ts
│   ├── gameplay/              # gameplay.gateway.ts, scoring.service.ts, leaderboard.service.ts
│   └── report/                # report.routes.ts, report.service.ts, report.repository.ts
├── middleware/
│   ├── auth.ts                # JWT verify
│   └── error-handler.ts       # Formata AppError, ZodError, erros 500
└── shared/
    ├── errors.ts              # AppError, NotFoundError, UnauthorizedError
    └── pagination.ts          # Helper de paginação
```

**Regras por camada no backend:**

- **Routes:** apenas interface. Recebe request, valida com Zod schema, chama service, retorna response. **Zero lógica de negócio. Zero acesso a banco.**
- **Service:** lógica de negócio pura. Chama o repository para acessar dados. **Não acessa Drizzle ou Redis diretamente.** Orquestra operações, aplica regras de negócio, decide o que persistir.
- **Repository:** camada fina de acesso a dados. Encapsula queries Drizzle (`db.query.*`, `db.insert`, `db.update`, `db.delete`) e operações Redis. **Zero lógica de negócio** — apenas busca e persiste. Recebe parâmetros tipados, retorna entidades tipadas.
- **Types:** interfaces e tipos TypeScript do módulo (entidades, inputs, outputs). Separado do schema Zod para evitar confusão entre tipo estático e validação runtime.
- **Gateway:** lógica de WebSocket. Recebe eventos, valida, chama services, emite respostas. Um gateway por namespace (`/host`, `/play`).
- **Schema (Zod):** define formato de entrada e saída para validação runtime. Usado pelas routes.
- **Middleware:** funções transversais (auth, erro). Não contêm regras de negócio.

### Frontend (`frontend/src/`)

```
frontend/src/
├── lib/
│   ├── api/                   # Model — funções puras de acesso a dados
│   │   ├── client.ts          #   fetch wrapper + Socket.IO client
│   │   ├── auth.ts            #   login(), register(), refresh(), logout()
│   │   ├── quizzes.ts         #   CRUD de questionários
│   │   ├── sessions.ts        #   criar partida, verificar PIN
│   │   └── reports.ts         #   buscar relatórios
│   │
│   ├── stores/                # ViewModel — estado reativo + lógica
│   │   ├── auth.store.ts
│   │   ├── quiz-editor.store.ts
│   │   ├── host-session.store.ts
│   │   ├── player-session.store.ts
│   │   └── leaderboard.store.ts
│   │
│   ├── components/            # View — componentes Svelte
│   │   ├── ui/                #   átomos: Button, Input, Card, Modal, Timer
│   │   ├── quiz/              #   QuizCard, QuestionEditor, AlternativeInput
│   │   ├── host/              #   LobbyScreen, QuestionReveal, LeaderboardHost
│   │   └── player/            #   JoinScreen, AnswerButtons, LeaderboardPlayer
│   │
│   ├── game/                  # Sockets — um arquivo por namespace
│   │   ├── socket-host.ts     #   Socket.IO /host
│   │   └── socket-player.ts   #   Socket.IO /play
│   │
│   └── types/                 # Tipos TypeScript compartilhados
│       ├── quiz.ts
│       ├── session.ts
│       └── events.ts
│
├── routes/                    # Rotas SvelteKit (file-based)
│   ├── (public)/              #   login, register
│   ├── (host)/                #   dashboard, editor, controle de partida
│   └── play/                  #   entrada (PIN+nickname), tela de jogo
```

## Comunicação em Tempo Real

Dois canais independentes, isolados por namespace Socket.IO:

| Namespace | Quem conecta | Autenticação                           |
| --------- | ------------ | -------------------------------------- |
| `/host`   | Apresentador | JWT (obrigatório)                      |
| `/play`   | Participante | PIN da partida (validado no handshake) |

**Regras dos gateways:**

- Gateway do `/host` emite `host:*` e recebe `session:*`, `player:*`
- Gateway do `/play` emite `player:*` e recebe `game:*`
- Toda pontuação é calculada no backend — o cliente nunca calcula score
- Opções de resposta enviadas ao Participante **nunca** incluem qual é a correta
- O Participante só pode responder uma vez por pergunta — gate no servidor

## Banco de Dados e Migrations

- **Schema Drizzle (`db/schema.ts`) é a fonte da verdade.** Nunca escreva SQL manual para estrutura.
- Migrations são geradas com `npx drizzle-kit generate` e aplicadas com `npx drizzle-kit migrate`
- Nunca edite arquivos dentro de `db/migrations/` manualmente
- Em desenvolvimento, use `drizzle-kit push` para prototipação rápida

## Git

Formato do commit:

```
<tipo>: <verbo no imperativo> <mensagem em português>
```

Tipos: `docs`, `feat`, `fix`, `chore`, `refactor`, `style`, `test`

Exemplos:

```
docs: adicionar regras de negócio ao documento de visão
feat: implementar geração de PIN de 6 dígitos
fix: corrigir cálculo de pontuação quando resposta é no limite do tempo
```

## Como Tirar Dúvidas Técnicas

Sempre que houver dúvida sobre a API, configuração, sintaxe ou melhores práticas de qualquer framework ou biblioteca da stack deste projeto, **consulte a documentação oficial antes de escrever código**.

Use a ferramenta Context7 MCP para buscar documentação atualizada. O fluxo é:

1. **Chame `resolve-library-id`** com o nome da biblioteca e a dúvida
2. **Escolha** o resultado com melhor pontuação e cobertura de snippets
3. **Chame `query-docs`** com o ID da biblioteca e a dúvida completa
4. **Implemente** baseado na documentação oficial, não em suposições

**Quando usar:** Dúvidas sobre Fastify, Socket.IO, Drizzle ORM, SvelteKit, Redis (ioredis), Zod, Nginx, ou qualquer outra biblioteca da stack — mesmo que você ache que já sabe a resposta. A documentação pode ter mudado.

**Quando NÃO usar:** Refatoração de código já existente no projeto, depuração de lógica de negócio, revisão de código, ou conceitos gerais de programação.

**Exemplo:**

```
Dúvida: "Como configurar CORS no Fastify 5?"
→ resolve-library-id("Fastify", "CORS configuration")
→ query-docs("/fastify/fastify", "How to configure CORS in Fastify 5")
→ Implementar baseado no snippet retornado
```

---

## Restrições — O Que NUNCA Fazer Sem Confirmação

Estas ações exigem que você peça confirmação antes de executar:

- Criar ou modificar migrations do Drizzle (`drizzle-kit generate`, `drizzle-kit migrate`)
- Instalar ou remover dependências (`npm install`, `pnpm add`, etc.)
- Fazer commit ou push
- Modificar o schema Drizzle (`db/schema.ts`)
- Alterar a estrutura de diretórios (criar ou renomear pastas de módulo)
- Adicionar uma nova dependência de infraestrutura (novo banco, fila, serviço externo)

## Restrições — O Que NUNCA Fazer (Ponto)

Estas ações são proibidas em qualquer circunstância:

- Escrever SQL manual para criar ou alterar tabelas — use sempre o Drizzle
- Fazer `fetch`, `socket.emit` ou qualquer chamada de API diretamente em um componente `.svelte` — use sempre queries, mutations ou ações da store
- Fazer `db.query()` ou equivalente em um arquivo de route, middleware, ou service
- Importar um arquivo `.svelte` dentro de uma store
- Enviar o gabarito (`isCorrect`) para o namespace `/play`
- Deixar `try/catch` em componente — erro é responsabilidade da store
- Criar classes abstratas, interfaces ou DI containers sem justificativa clara e aprovada
- Criar um repositório genérico com métodos como `findAll`, `findById`, `create`, `update`, `delete` — cada repository deve ter métodos com nomes específicos ao domínio (`findByEmail`, `listByAuthor`, `getWithQuestions`)
