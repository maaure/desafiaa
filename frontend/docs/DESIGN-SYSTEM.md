# Design System — Desafia. · "Cartolina + Atmosfera GeoGuessr"

> Documento normativo para agentes e desenvolvedores que tocarem o frontend.
> **Regra de ouro:** se um valor visual não é um token, ele não existe. Nunca use hex, tamanho ou sombra "na mão" em um componente — sempre consuma tokens do `src/app.css`.

---

## 1. Identidade

- **Produto:** Desafia. — plataforma de quizzes em tempo real (estilo game show).
- **Domínio:** `desafia.fun` · interface 100% em **pt-BR**.
- **Direção visual:** _Cartolina_ (matéria: tinta, papel, sombra dura) com a **atmosfera do GeoGuessr** (tudo claro, arejado, tipografia GRANDE e moderna). A sala de aula virou palco — sem virar laboratório.
- **Público:** Hosts (professores, facilitadores) e Players (participantes anônimos no celular).

### A linguagem em 5 leis

1. **Contorno de tinta** — superfícies interativas têm `border-2` (ou `border-[3px]` nos momentos de palco) na cor `ink`. Se tem borda fina ou sem borda, não parece um objeto de cartolina.
2. **Sombra dura** — profundidade é papel empilhado: `shadow-soft`/`shadow-lift`/`shadow-glow` são todas **sólidas e deslocadas** (offset, zero blur).
3. **Tudo claro** — **não existe modo escuro**. Fundo `bg-surface`, cards `bg-surface-raised`, texto `ink`. O dark com a paleta tropical não funciona neste produto.
4. **Tipografia GEOGUESSR** — corpo mínimo 16px (`text-sm`), títulos enormes (Baloo 2 em `text-2xl`+), espaçamento de linha generoso. Legibilidade para baixa visão é prioridade.
5. **Imperfeição deliberada** — um selo levemente torto (`rotate-1`), um canto de tesoura, um badge deslocado. Um detalhe por tela, nunca três.

### O que o design NÃO é (os 3 clones de IA a evitar)

| Clone                         | Evitar                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------- |
| 🎨 Cream + serifa + terracota | Não usar fundo amarelado/quente — neutros são FRIOS (`#f8f9fb`)                       |
| 🌑 **Dark mode**              | **Proibido**: telas escuras, sidebars escuras, gameplays escuros. Tudo claro          |
| 🪟 **Glassmorphism**          | **Proibido**: `backdrop-blur` + fundos translúcidos. Superfícies são cartolina sólida |

---

## 2. Princípios

1. **Uma marca, dois tons:** _Ocean_ (identidade, profundidade) + _Coral_ (ação, energia). O ponto do logo é coral.
2. **Celebrar é função:** acertos, pódio e recordes ganham selos tortos, `animate-pop` e cartolina colorida. Dados administrativos ficam calmos.
3. **Botão que afunda:** todo elemento pressionável tem sombra dura que "desce" no clique (`active:translate-y-[2px] active:shadow-none`) — o gesto físico do papel.
4. **KISS:** um único arquivo de tokens (`src/app.css`) + Tailwind v4. Zero build steps de design, zero dependências de tema.
5. **DRY:** nenhum valor duplicado — componentes consomem tokens semânticos (`bg-primary`, `text-ink`, `shadow-lift`), nunca o hex direto.

---

## 3. Tokens — Paleta

Todas as cores vivem em `src/app.css` no bloco `@theme`. Escalas completas (50–950) para as 6 famílias.

### 3.1 Famílias

| Família    | Papel                   | Uso                                                                 |
| ---------- | ----------------------- | ------------------------------------------------------------------- |
| **Sand**   | Papel                   | Fundos (`sand-50`), superfícies, texto (`sand-950` = tinta), bordas |
| **Ocean**  | Identidade / secundário | Sidebar, navegação, links, foco                                     |
| **Coral**  | Ação / energia          | CTAs primários, timer de emergência, ponto do logotipo              |
| **Leaf**   | Sucesso                 | Acertos, confirmações, progresso de respostas                       |
| **Mango**  | Conquista / ouro        | #1 do pódio, selo "Sua posição", recorde                            |
| **Tomato** | Erro / perigo           | Erros, exclusões, timeout                                           |

### 3.2 Tokens semânticos (use SEMPRE estes em componentes)

| Token                         | Valor        | Use para                                      |
| ----------------------------- | ------------ | --------------------------------------------- |
| `bg-surface`                  | `sand-50`    | Fundo de página (papel)                       |
| `bg-surface-raised`           | `#FFFFFF`    | Cards (cartolina branca)                      |
| `text-ink`                    | `sand-950`   | Texto primário + **contornos** (`border-ink`) |
| `text-ink-soft`               | `sand-700`   | Texto secundário                              |
| `text-ink-faint`              | `sand-500`   | Captions, placeholders                        |
| `border-ink`                  | `sand-950`   | Contorno de tinta de tudo que é objeto        |
| `bg-primary`                  | `coral-600`  | Botão primário, CTA                           |
| `bg-primary-hover`            | `coral-700`  | Hover do primário                             |
| `bg-primary-soft`             | `coral-100`  | Fundos de destaque suaves                     |
| `text-primary`                | `coral-600`  | Texto de ação (links de CTA)                  |
| `bg-secondary`                | `ocean-600`  | Ações secundárias fortes                      |
| `text-secondary`              | `ocean-600`  | Links, navegação                              |
| `bg-success` / `text-success` | `leaf-600`   | Acertos, confirmação                          |
| `bg-warning` / `text-warning` | `mango-500`  | Destaques de conquista                        |
| `bg-danger` / `text-danger`   | `tomato-600` | Erros, exclusão                               |
| `bg-answer-a`                 | `coral-500`  | Alternativa A (e "Falso")                     |
| `bg-answer-b`                 | `ocean-500`  | Alternativa B                                 |
| `bg-answer-c`                 | `leaf-600`   | Alternativa C (e "Verdadeiro")                |
| `bg-answer-d`                 | `mango-600`  | Alternativa D                                 |

> C/D usam `-600` (não `-500`) porque branco sobre `leaf-500`/`mango-500` não atinge 3:1 nem para texto grande.

### 3.3 Sombras (todas duras)

| Token         | Valor           | Use para                                     |
| ------------- | --------------- | -------------------------------------------- |
| `shadow-soft` | `2px 2px 0 ink` | Objetos pequenos: inputs, badges, botões     |
| `shadow-lift` | `4px 4px 0 ink` | Cards, painéis, telas de jogo                |
| `shadow-glow` | `3px 3px 0 ink` | Momentos de palco: PIN, CTA principal, selos |

No hover de cards interativos: `hover:shadow-lift` + `hover:-translate-y-0.5`. No clique: `active:translate-y-[2px] active:shadow-none`.

### 3.4 Regras de contraste (obrigatório)

| Par                                                  | Contraste  | Uso permitido                                        |
| ---------------------------------------------------- | ---------- | ---------------------------------------------------- |
| Branco sobre `coral-600` / `mango-600`               | ~4.0–4.8:1 | **Apenas texto grande/botões** (≥14px bold ou ≥18px) |
| Branco sobre `ocean-600` / `leaf-600` / `tomato-600` | ≥4.5:1     | Texto normal                                         |
| `coral-700` / `ocean-700` / `leaf-700` sobre branco  | ≥5.5:1     | Texto pequeno e links                                |
| `ink` (`sand-950`) sobre `sand-50` / branco          | ≥12:1      | Texto de corpo e contornos                           |
| Texto sobre `mango-*` claro: usar `mango-900`        | ≥7:1       | Badges de ouro                                       |

---

## 4. Tipografia

| Papel   | Fonte              | Peso    | Uso                                             |
| ------- | ------------------ | ------- | ----------------------------------------------- |
| Display | **Baloo 2**        | 600–800 | Títulos, PIN, pergunta ao vivo, números do jogo |
| Corpo   | **Inter**          | 400–600 | Texto, labels, tabelas                          |
| Dados   | **JetBrains Mono** | 500–700 | Timer, números tabulares                        |

- Fontes carregadas via Google Fonts no `src/app.html` (uma única request).
- **Escala GeoGuessr — corpo mínimo 16px:** `text-sm` = 1rem, `text-base` = 1.125rem, `text-lg` = 1.25rem, `text-2xl` = 1.875rem, `text-3xl` = 2.375rem. Captions (`text-xs`) = 0.8125rem, nunca menor.
- Baloo 2 já é redonda e cheia: `tracking-tight` em display, `tracking-[0.2em]` no PIN.
- Escala de palco (jogo / momentos de destaque):

| Token        | Valor                                         |
| ------------ | --------------------------------------------- |
| `text-hero`  | `clamp(3rem, 9vw, 5.5rem)`, line-height `1`   |
| `text-stage` | `clamp(2rem, 6vw, 3.5rem)`, line-height `1.1` |

Use `text-hero` no PIN do Host e na pergunta do Player; `text-stage` em telas de jogo (pódio, feedback).

---

## 5. Layout & Superfícies

- **Raios:** cards = `rounded-2xl` (cartolina cortada). `rounded-organic` = canto de tesoura (`2rem 2rem 0.5rem 2rem`) reservado para **feature cards** (landing, cards de quiz no dashboard, PIN). Botões e inputs = `rounded-xl`.
- **Superfície:** tudo sólido e CLARO. Cartolina branca (`bg-surface-raised`) sobre fundo claro (`bg-surface`). **Zero transparência/glass, zero dark.**
- **Sidebar do host:** clara (`bg-surface-raised`, borda `ink`), itens `text-base` com alvo ≥ 44px, grupos rotulados ("Meus Quizzes" / "Criar" / "Quiz Atual").
- **Textura:** `paper-dots` (pontos de caderno) em seções de destaque — hero da landing, fundos de entrada. Nunca sobre áreas de leitura densa.
- **Imperfeições:** selos com `rotate-1`/`-rotate-1`, badges com `animate-wiggle` (apenas 1 por tela).
- **Grid do jogo (Player):** interface pensada para polegar — alternativas ≥ 56px de altura (`min-h-16`), alvo de toque ≥ 48px, texto `text-xl`+.

---

## 6. Componentes

### 6.1 Botões (`ui/Button.svelte`)

| Variant     | Classes (além do base)                              |
| ----------- | --------------------------------------------------- |
| `primary`   | `bg-primary text-white hover:bg-primary-hover`      |
| `default`   | `bg-surface-raised text-ink-soft hover:bg-sand-100` |
| `secondary` | `bg-ocean-50 text-ocean-800 hover:bg-ocean-100`     |
| `danger`    | `bg-danger text-white hover:bg-tomato-700`          |

Base obrigatório: `border-2 border-ink shadow-soft active:translate-y-[2px] active:shadow-none`, `font-semibold`, `rounded-lg`, texto ≥ 0.875rem.

### 6.2 Inputs (`ui/Input.svelte`)

`border-2 border-ink bg-surface-raised shadow-soft`, foco `focus:border-ocean-500`. Erro: borda `tomato-500` + mensagem `text-danger text-sm`.

### 6.3 Alternativas de resposta (jogo)

- Cor por posição: **A** coral · **B** ocean · **C** leaf · **D** mango (tokens `bg-answer-*`).
- Verdadeiro/Falso: **Verdadeiro** = leaf, **Falso** = coral.
- Cartolina grossa: `border-2 border-ink shadow-soft active:translate-y-[2px] active:shadow-none`, texto branco em Baloo 2 700–800, `min-h-14` no Player.
- Acerto após revelar: manter cor + `ring-4 ring-leaf-200` + `animate-pop`. Errado: `opacity-40`.

### 6.4 Pódio e ranking

- Top 3: barras em **mango** (#1), **sand-300** (#2), **coral-700** (#3) com `border-2 border-ink shadow-soft`. Medalhas emoji 🥇🥈🥉 permitidas.
- Linha do próprio jogador: `bg-ocean-50` + borda `ocean-300`.
- #1 na tabela: selo `bg-mango-400 text-mango-950 border-2 border-ink rotate-1`.

### 6.5 Timer

- Círculo de contagem em **mono**, `border-2 border-ink`, cor `ocean-600`; abaixo de 5s vira `tomato-600` + `animate-pulse-soft` + fundo `tomato-50`.
- Barra de progresso de respostas: `border-2 border-ink bg-sand-100`, fill `leaf-500`.

### 6.6 Estados vazios e de erro

- Vazio: ícone lucide + título + 1 frase + CTA claro, com moldura tracejada (`border-dashed border-ink/30`).
- Erro: texto de ação, nunca código técnico. Nada de "500 Internal Server Error" para o usuário.

---

## 7. Motion

| Animação           | Token                | Onde                                        |
| ------------------ | -------------------- | ------------------------------------------- |
| Entrada de card    | `animate-rise`       | Cards, telas de jogo ao trocar de fase      |
| Acerto             | `animate-pop`        | Alternativa correta, badge de pontos ganhos |
| Glow do PIN        | `animate-pulse-soft` | PIN do Host, timer crítico                  |
| Orb decorativa     | `animate-blob`       | Blobs de fundo (entradas)                   |
| Selo vivo          | `animate-wiggle`     | Máximo 1 por tela, em selos de conquista    |
| Decoração contínua | `animate-float`      | Ícones/cards flutuantes da landing          |

- **Press físico:** `active:translate-y-[2px] active:shadow-none` em todo botão/cartão clicável.
- **Obrigatório:** `prefers-reduced-motion: reduce` desliga todas as animações (já implementado no `app.css`, manter).

---

## 8. Microcopy (voz do produto)

- **pt-BR, imperativo e ativo:** "Criar quiz", não "Submit". O botão diz exatamente o que faz; o toast repete a ação ("Publicado", não "Sucesso!").
- Nomes do ponto de vista do usuário: Player vê "Sua pontuação", Host vê "Pontuação dos jogadores".
- Erros orientam o conserto: "PIN inválido — confira o código com o apresentador."
- Sem excesso de exclamações; a celebração fica nos acertos do jogo, não nos formulários.

---

## 9. Acessibilidade

- Foco visível: `outline-2 outline-ocean-500` (`outline-offset-2`).
- Contraste: seção 3.4 é norma, não sugestão.
- Alvos de toque ≥ 48px no fluxo do Player; alternativas ≥ 56px.
- `prefers-reduced-motion` sempre respeitado.
- Formulários: `<label>` real ligado ao input, mensagem de erro associada via `aria-describedby`.

---

## 10. Arquitetura — SOLID, KISS, DRY

### Como o design system materializa cada princípio

| Princípio | Implementação                                                                                                                                                                                                            |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **SRP**   | Cada componente tem um trabalho. Tokens vivem só em `app.css`; componentes só consomem.                                                                                                                                  |
| **OCP**   | Variantes via props (ex.: `Button variant`, `Podium compact`). Novo visual = novo token ou prop, nunca duplicar componente.                                                                                              |
| **LSP**   | Primitivas substituíveis: `Button`/`Input` trocam por variantes sem quebrar contrato de props.                                                                                                                           |
| **ISP**   | Primitivas expõem o mínimo de props possível.                                                                                                                                                                            |
| **DIP**   | Componentes dependem de **tokens** (abstração em `app.css`), nunca de valores concretos. Trocar a direção visual = editar `app.css`, zero mudança em componentes.                                                        |
| **KISS**  | Um arquivo de tokens, Tailwind v4, sem gerador, sem lib de tema.                                                                                                                                                         |
| **DRY**   | Valor definido uma vez (paleta) e referenciado (semântico via `@theme inline`). As sombras `soft/lift/glow` mantiveram os nomes legados e mudaram de valor — quem consumia ganhou o visual novo sem tocar em componente. |

### Regras de código

1. Todo estilo de componente usa classes utilitárias de token. Hex fora do `app.css` = bug de design.
2. Nomes de tokens semânticos (nomes de papel), nunca descritivos ("primary", não "coral-600" no componente).
3. Novas variantes de cor → primeiro token semântico, depois prop/classes.
4. `app.css` é o **único** arquivo de estilo global. Nenhum `<style>` global em página.
5. **Todo elemento clicável** = `border-2 border-ink` + sombra dura + `active:translate-y-[2px] active:shadow-none`.

---

## 11. Migração (Futurismo Tropical → Cartolina)

O v1 trocou cores/tipografia mas manteve a linguagem de vidro/sombra difusa. O v2 muda a **linguagem**:

1. `app.css` — já migrado: sombras duras, `font-display` = Baloo 2, `rounded-organic` = canto de tesoura, utilitário `paper-dots`.
2. `app.html` — já migrado: Baloo 2 no lugar de Outfit.
3. **Em componentes/páginas, garanta por elemento:**
   - Cards e botões: `border-2 border-ink` + `shadow-soft`/`shadow-lift` (valores já são duros) + `active:translate-y-[2px] active:shadow-none` em clicáveis.
   - Inputs: `border-2 border-ink`.
   - Nada de `backdrop-blur`, `bg-white/70`, `border-white/60` (glass) — trocar por cartolina sólida.
   - Selos de destaque: `rotate-1`/`-rotate-1` (máx. 1 por tela).
   - Feature cards: `rounded-organic`.

---

## 12. Consumo rápido (snippets)

```svelte
<!-- CTA (botão afunda no clique) -->
<button
  class="rounded-lg border-2 border-ink bg-primary px-5 py-2.5 font-semibold text-white
  shadow-soft hover:bg-primary-hover active:translate-y-[2px] active:shadow-none"
>
  Criar quiz
</button>

<!-- Card de jogo (cartolina) -->
<div class="rounded-2xl border-2 border-ink bg-surface-raised p-6 shadow-lift">
  <h2 class="font-display text-stage font-bold text-ink">Pergunta 3 de 10</h2>
</div>

<!-- PIN do Host (selo de palco) -->
<p class="font-display text-hero font-bold tracking-[0.3em] text-primary animate-pulse-soft">
  482916
</p>

<!-- Alternativa de resposta (Player) -->
<button
  class="min-h-14 rounded-xl border-2 border-ink bg-answer-a py-4 font-display text-xl font-bold
  text-white shadow-soft active:translate-y-[2px] active:shadow-none"
>
  A · 1789
</button>

<!-- Selo de conquista (levemente torto) -->
<span
  class="rounded-full border-2 border-ink bg-mango-400 px-3 py-1 text-xs font-bold text-mango-950 rotate-1"
>
  1º lugar
</span>
```

> **Resumo para agentes:** leia `app.css` antes de estilizar; consuma tokens semânticos; direção visual é **Cartolina** (papel + tinta + sombra dura + imperfeição deliberada); glass e sombra difusa são proibidos; violeta/slate são proibidos; pt-BR imperativo no copy.
