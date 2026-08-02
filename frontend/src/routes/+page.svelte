<script lang="ts">
  import { resolve } from "$app/paths";
  import {
    FileQuestion,
    Users,
    Zap,
    Trophy,
    Timer,
    BarChart3,
    ShieldCheck,
    ArrowRight,
    Play,
    Share2,
    Pencil,
    Sparkles,
    Gamepad2,
  } from "@lucide/svelte";

  // ── As quatro cores de resposta — as mesmas que o Player vê no jogo ──
  // Hex = var CSS do token (DRY: a fonte de verdade é o app.css)
  const answerColors = [
    { letter: "A", bg: "bg-answer-a", hex: "var(--color-coral-500)" },
    { letter: "B", bg: "bg-answer-b", hex: "var(--color-ocean-500)" },
    { letter: "C", bg: "bg-answer-c", hex: "var(--color-leaf-600)" },
    { letter: "D", bg: "bg-answer-d", hex: "var(--color-mango-600)" },
  ];

  const steps = [
    {
      icon: Pencil,
      title: "Crie seu quiz",
      desc: "Monte questionários com perguntas de múltipla escolha ou verdadeiro/falso. Defina pontuações e gabaritos com um editor rápido e intuitivo.",
      color: "coral" as const,
    },
    {
      icon: Share2,
      title: "Compartilhe o PIN",
      desc: "Ao iniciar uma sessão, um PIN de 6 dígitos é gerado. Compartilhe com seus participantes e veja todos entrarem no lobby em tempo real.",
      color: "mango" as const,
    },
    {
      icon: Zap,
      title: "Jogue ao vivo",
      desc: "Avance as perguntas, acompanhe as respostas chegando e veja o ranking se formar. Ao final, o pódio revela os vencedores.",
      color: "leaf" as const,
    },
  ];

  const colorMap = {
    coral: {
      light: "bg-coral-50 border-coral-200",
      text: "text-coral-600",
      bar: "bg-coral-500",
    },
    mango: {
      light: "bg-mango-50 border-mango-200",
      text: "text-mango-600",
      bar: "bg-mango-500",
    },
    leaf: {
      light: "bg-leaf-50 border-leaf-200",
      text: "text-leaf-600",
      bar: "bg-leaf-500",
    },
    ocean: {
      light: "bg-ocean-50 border-ocean-200",
      text: "text-ocean-600",
      bar: "bg-ocean-500",
    },
  };

  const hostFeatures = [
    {
      icon: FileQuestion,
      title: "Editor intuitivo de quizzes",
      desc: "Crie perguntas de múltipla escolha ou verdadeiro/falso com gabarito e pontuação personalizada em minutos.",
      color: "coral" as const,
    },
    {
      icon: Users,
      title: "Controle total da sessão",
      desc: "Abra o lobby, veja os participantes chegando em tempo real e avance as perguntas no seu ritmo.",
      color: "mango" as const,
    },
    {
      icon: Trophy,
      title: "Leaderboard em tempo real",
      desc: "Ranking atualizado a cada pergunta. Destaque visual para mudanças de posição e pódio final completo.",
      color: "leaf" as const,
    },
    {
      icon: BarChart3,
      title: "Relatórios detalhados",
      desc: "Taxa de acerto por pergunta, tempo médio de resposta, questões mais difíceis e histórico de sessões.",
      color: "ocean" as const,
    },
  ];

  const playerFeatures = [
    {
      icon: Play,
      title: "Entre com um PIN de 6 dígitos",
      desc: "Sem cadastro, sem instalar nada. Acesse pelo navegador do celular ou computador e participe na hora.",
      color: "coral" as const,
    },
    {
      icon: Zap,
      title: "Respostas em tempo real",
      desc: "As perguntas aparecem simultaneamente para todos. Quanto mais rápido você responde, mais pontos ganha.",
      color: "mango" as const,
    },
    {
      icon: Timer,
      title: "Feedback imediato",
      desc: "Veja na hora se acertou ou errou, quantos pontos ganhou e sua pontuação total acumulada na partida.",
      color: "leaf" as const,
    },
    {
      icon: ShieldCheck,
      title: "Reconexão automática",
      desc: "Perdeu a conexão? Seus pontos e apelido estão salvos. Reconecte em até 30 segundos e continue jogando.",
      color: "ocean" as const,
    },
  ];

  const stats = [
    { value: "500", label: "Participantes simultâneos por sessão" },
    { value: "6", label: "Dígitos do PIN — simples e rápido de compartilhar" },
    { value: "< 500ms", label: "Latência de resposta — jogo fluido e sincronizado" },
  ];
</script>

<svelte:head>
  <title>Desafia — A maneira mais divertida de engajar qualquer audiência</title>
  <meta
    name="description"
    content="Plataforma de quizzes interativos em tempo real. Crie questionários, compartilhe um PIN e veja todos competirem ao vivo — como um game show, na sua sala."
  />
</svelte:head>

<!-- ════════════════════════════════════════════ -->
<!--  NAV                                       -->
<!-- ════════════════════════════════════════════ -->
<nav class="sticky top-0 z-50 bg-surface-raised border-b-2 border-ink">
  <div class="mx-auto max-w-7xl flex h-16 items-center justify-between px-6">
    <a href="/" class="flex items-center gap-2">
      <span
        class="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary border-2 border-ink shadow-soft"
      >
        <Gamepad2 class="w-4.5 h-4.5 text-white" />
      </span>
      <span class="font-display text-xl font-extrabold tracking-tight text-ink">
        Desafia<span class="text-primary">.</span>
      </span>
    </a>

    <div class="hidden md:flex items-center gap-8">
      <a
        href="#funcionalidades"
        class="text-sm font-semibold text-ink-faint hover:text-ink transition-colors"
      >
        Funcionalidades
      </a>
      <a
        href="#como-funciona"
        class="text-sm font-semibold text-ink-faint hover:text-ink transition-colors"
      >
        Como funciona
      </a>
    </div>

    <div class="flex items-center gap-3">
      <a
        href={resolve("/play")}
        class="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-ink-soft
        hover:text-ink hover:bg-sand-100 rounded-lg transition-colors"
      >
        <Play class="w-3.5 h-3.5" />
        Entrar em jogo
      </a>
      <a
        href={resolve("/register")}
        class="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 text-sm font-bold
        rounded-lg border-2 border-ink shadow-soft hover:bg-primary-hover active:bg-coral-800
        active:translate-y-[2px] active:shadow-none transition-all"
      >
        Criar conta grátis
        <ArrowRight class="w-3.5 h-3.5" />
      </a>
    </div>
  </div>
</nav>

<!-- ════════════════════════════════════════════ -->
<!--  HERO                                      -->
<!-- ════════════════════════════════════════════ -->
<section class="relative overflow-hidden bg-surface-raised">
  <!-- Textura de papel -->
  <div class="absolute inset-0 paper-dots opacity-40"></div>

  <div
    class="relative mx-auto max-w-7xl px-6 py-24 lg:py-32 lg:grid lg:grid-cols-2 lg:gap-16 items-center"
  >
    <!-- Left: Text -->
    <div class="animate-slide-up">
      <!-- Badge -->
      <div
        class="inline-flex items-center gap-2 bg-ocean-50 border-2 border-ink px-3.5 py-1.5 mb-8 rounded-full shadow-soft -rotate-1"
      >
        <Sparkles class="w-3.5 h-3.5 text-ocean-500" />
        <span class="text-xs font-bold text-ocean-700 tracking-wide uppercase">
          Plataforma de quizzes em tempo real
        </span>
      </div>

      <h1
        class="font-display text-4xl lg:text-5xl xl:text-6xl font-extrabold text-ink leading-[1.06] tracking-tight"
      >
        A maneira mais
        <span class="text-primary">divertida</span>
        de engajar qualquer audiência
      </h1>

      <p class="mt-6 text-lg text-ink-soft leading-relaxed max-w-xl">
        Crie quizzes interativos em minutos, compartilhe um PIN de 6 dígitos e veja dezenas de
        pessoas competirem em tempo real — <strong class="text-ink"
          >como um game show, na sua sala.</strong
        >
      </p>

      <div class="mt-10 flex flex-col sm:flex-row gap-3">
        <a
          href={resolve("/register")}
          class="inline-flex items-center justify-center gap-2 bg-primary
          text-white px-7 py-3.5 text-base font-bold rounded-lg border-2 border-ink shadow-soft
          hover:bg-primary-hover active:bg-coral-800 active:translate-y-[2px] active:shadow-none transition-all"
        >
          Criar conta grátis
          <ArrowRight class="w-4 h-4" />
        </a>
        <a
          href={resolve("/play")}
          class="inline-flex items-center justify-center gap-2 border-2 border-ink bg-surface-raised text-ink-soft
          px-7 py-3.5 text-base font-bold rounded-lg shadow-soft hover:bg-sand-50
          active:translate-y-[2px] active:shadow-none transition-all"
        >
          <Play class="w-4 h-4" />
          Entrar em um jogo
        </a>
      </div>

      <p class="mt-6 text-sm text-ink-faint">
        Sem compromisso. Crie sua conta e comece a usar em menos de 2 minutos.
      </p>
    </div>

    <!-- Right: Colorful Answer Grid + Confetti -->
    <div
      class="hidden lg:flex items-center justify-center relative mt-16 lg:mt-0"
      aria-hidden="true"
    >
      <!-- Confetti dots -->
      <div class="absolute inset-0 pointer-events-none">
        {#each Array(16) as _, i (i)}
          {@const cx = answerColors[i % 4]}
          {@const x = 15 + ((i * 37) % 90)}
          {@const y = 8 + ((i * 53) % 85)}
          {@const size = 4 + (i % 3) * 3}
          {@const delay = (i * 0.35) % 3.5}
          <div
            class="absolute rounded-full confetti-dot"
            style="left: {x}%; top: {y}%; width: {size}px; height: {size}px; background-color: {cx.hex}; animation-delay: {delay}s; opacity: 0.45;"
          ></div>
        {/each}
      </div>

      <!-- 2x2 Answer Grid — cartolina torta com sombra de tinta -->
      <div class="relative grid grid-cols-2 gap-5 w-[300px] h-[300px]">
        {#each answerColors as card, i (card.letter)}
          <div
            class="flex items-center justify-center {card.bg} border-[3px] border-ink rounded-2xl shadow-lift animate-answer-card relative {i %
              2 ===
            0
              ? 'rotate-1'
              : '-rotate-1'}"
            style="animation-delay: {i * 0.12}s;"
          >
            <span class="font-display text-6xl font-extrabold text-white">{card.letter}</span>
          </div>
        {/each}
      </div>
    </div>
  </div>
</section>

<!-- ════════════════════════════════════════════ -->
<!--  COMO FUNCIONA                             -->
<!-- ════════════════════════════════════════════ -->
<section id="como-funciona" class="bg-surface">
  <div class="mx-auto max-w-7xl px-6 py-24">
    <div class="text-center mb-16">
      <h2 class="font-display text-3xl font-extrabold text-ink tracking-tight">Como funciona</h2>
      <p class="mt-4 text-lg text-ink-soft max-w-xl mx-auto">
        Do quiz pronto ao pódio final em três passos simples.
      </p>
    </div>

    <div class="grid sm:grid-cols-3 gap-8">
      {#each steps as step, si (step.title)}
        <div
          class="bg-surface-raised border-2 border-ink p-8 rounded-organic relative overflow-hidden group
          shadow-soft hover:shadow-lift hover:-translate-y-1 transition-all {si === 1
            ? 'rotate-[0.5deg]'
            : ''}"
        >
          <!-- Linha de acento colorida -->
          <div class="absolute top-0 left-0 right-0 h-1.5 {colorMap[step.color].bar}"></div>

          <!-- Ícone em caixa colorida -->
          <div
            class="w-12 h-12 flex items-center justify-center {colorMap[step.color]
              .light} border-2 border-ink rounded-lg mb-6 shadow-soft"
          >
            <step.icon class="w-6 h-6 {colorMap[step.color].text}" />
          </div>

          <h3 class="font-display text-lg font-bold text-ink mb-3">
            <span class={colorMap[step.color].text}>{steps.indexOf(step) + 1}.</span>
            {step.title}
          </h3>
          <p class="text-sm text-ink-soft leading-relaxed">{step.desc}</p>
        </div>
      {/each}
    </div>
  </div>
</section>

<!-- ════════════════════════════════════════════ -->
<!--  FUNCIONALIDADES                            -->
<!-- ════════════════════════════════════════════ -->
<section id="funcionalidades" class="bg-surface-raised">
  <div class="mx-auto max-w-7xl px-6 py-24">
    <div class="text-center mb-16">
      <h2 class="font-display text-3xl font-extrabold text-ink tracking-tight">
        Tudo que você precisa para engajar
      </h2>
      <p class="mt-4 text-lg text-ink-soft max-w-xl mx-auto">
        Ferramentas pensadas tanto para quem apresenta quanto para quem participa.
      </p>
    </div>

    <div class="grid lg:grid-cols-2 gap-12">
      <!-- Host features -->
      <div>
        <div class="flex items-center gap-3 mb-8">
          <div
            class="w-10 h-10 flex items-center justify-center bg-secondary rounded-lg border-2 border-ink shadow-soft"
          >
            <Trophy class="w-5 h-5 text-white" />
          </div>
          <h3 class="font-display text-xl font-bold text-ink">Para Apresentadores</h3>
        </div>

        <div class="space-y-4">
          {#each hostFeatures as feature (feature.title)}
            <div
              class="flex gap-4 p-4 border-2 border-ink bg-surface-raised shadow-soft hover:bg-sand-50 rounded-xl transition-colors group"
            >
              <div
                class="w-10 h-10 shrink-0 flex items-center justify-center {colorMap[feature.color]
                  .light} border-2 border-ink rounded-lg"
              >
                <feature.icon class="w-5 h-5 {colorMap[feature.color].text}" />
              </div>
              <div>
                <h4 class="text-sm font-bold text-ink mb-1">{feature.title}</h4>
                <p class="text-sm text-ink-soft leading-relaxed">{feature.desc}</p>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <!-- Player features -->
      <div>
        <div class="flex items-center gap-3 mb-8">
          <div
            class="w-10 h-10 flex items-center justify-center bg-leaf-500 rounded-lg border-2 border-ink shadow-soft"
          >
            <Users class="w-5 h-5 text-white" />
          </div>
          <h3 class="font-display text-xl font-bold text-ink">Para Participantes</h3>
        </div>

        <div class="space-y-4">
          {#each playerFeatures as feature (feature.title)}
            <div
              class="flex gap-4 p-4 border-2 border-ink bg-surface-raised shadow-soft hover:bg-sand-50 rounded-xl transition-colors group"
            >
              <div
                class="w-10 h-10 shrink-0 flex items-center justify-center {colorMap[feature.color]
                  .light} border-2 border-ink rounded-lg"
              >
                <feature.icon class="w-5 h-5 {colorMap[feature.color].text}" />
              </div>
              <div>
                <h4 class="text-sm font-bold text-ink mb-1">{feature.title}</h4>
                <p class="text-sm text-ink-soft leading-relaxed">{feature.desc}</p>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ════════════════════════════════════════════ -->
<!--  STATS                                     -->
<!-- ════════════════════════════════════════════ -->
<section class="bg-ocean-950 border-y-[3px] border-ink relative overflow-hidden">
  <!-- Orbes decorativas -->
  <div class="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-ocean-500/10 blur-3xl"></div>
  <div class="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-coral-400/10 blur-3xl"></div>

  <div class="relative mx-auto max-w-7xl px-6 py-20">
    <div class="grid sm:grid-cols-3 gap-4">
      {#each stats as stat (stat.label)}
        <div class="bg-ocean-900 border-2 border-ink rounded-2xl p-10 text-center shadow-soft">
          <div class="font-display text-5xl font-extrabold text-white tracking-tight mb-3">
            {stat.value}
          </div>
          <p class="text-sm text-ocean-200 leading-relaxed max-w-[200px] mx-auto">
            {stat.label}
          </p>
        </div>
      {/each}
    </div>
  </div>
</section>

<!-- ════════════════════════════════════════════ -->
<!--  CTA FINAL                                 -->
<!-- ════════════════════════════════════════════ -->
<section class="bg-surface-raised border-t border-line relative overflow-hidden">
  <div class="mx-auto max-w-7xl px-6 py-24 text-center relative">
    <h2 class="font-display text-3xl lg:text-4xl font-extrabold text-ink tracking-tight">
      Pronto para transformar sua audiência
      <span class="text-primary">em competidores?</span>
    </h2>
    <p class="mt-4 text-lg text-ink-soft max-w-lg mx-auto">
      Crie sua conta gratuita, monte seu primeiro quiz e veja o engajamento acontecer ao vivo.
    </p>
    <div class="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
      <a
        href={resolve("/register")}
        class="inline-flex items-center gap-2 bg-primary text-white
        px-8 py-3.5 text-base font-bold rounded-lg border-2 border-ink shadow-soft
        hover:bg-primary-hover active:bg-coral-800 active:translate-y-[2px] active:shadow-none transition-all"
      >
        Criar conta grátis
        <ArrowRight class="w-4 h-4" />
      </a>
      <a
        href={resolve("/play")}
        class="inline-flex items-center gap-2 border-2 border-ink bg-surface-raised text-ink-soft px-8 py-3.5
        text-base font-bold rounded-lg shadow-soft hover:bg-sand-50
        active:translate-y-[2px] active:shadow-none transition-all"
      >
        <Play class="w-4 h-4" />
        Entrar em um jogo
      </a>
    </div>
  </div>
</section>

<!-- ════════════════════════════════════════════ -->
<!--  FOOTER                                    -->
<!-- ════════════════════════════════════════════ -->
<footer class="bg-surface border-t-2 border-ink">
  <div
    class="mx-auto max-w-7xl px-6 py-12 flex flex-col sm:flex-row items-center justify-between gap-6"
  >
    <a href="/" class="flex items-center gap-2">
      <span
        class="flex items-center justify-center w-7 h-7 rounded-md bg-secondary border-2 border-ink shadow-soft"
      >
        <Gamepad2 class="w-4 h-4 text-white" />
      </span>
      <span class="font-display text-lg font-extrabold text-ink tracking-tight">
        Desafia<span class="text-primary">.</span>
      </span>
    </a>

    <div class="flex items-center gap-8 text-sm text-ink-faint">
      <a href={resolve("/login")} class="hover:text-ink-soft transition-colors font-medium">
        Acessar painel
      </a>
      <a href={resolve("/register")} class="hover:text-ink-soft transition-colors font-medium">
        Criar conta
      </a>
      <a href={resolve("/play")} class="hover:text-ink-soft transition-colors font-medium">
        Entrar em jogo
      </a>
    </div>

    <p class="text-sm text-ink-faint">
      &copy; {new Date().getFullYear()} Desafia
    </p>
  </div>
</footer>

<!-- ════════════════════════════════════════════ -->
<!--  ANIMATIONS                                -->
<!-- ════════════════════════════════════════════ -->
<style>
  @keyframes answer-card-float {
    0%,
    100% {
      transform: translateY(0) rotate(0deg);
    }
    50% {
      transform: translateY(-14px) rotate(0.8deg);
    }
  }

  @keyframes confetti-drift {
    0%,
    100% {
      transform: translateY(0) translateX(0) scale(1);
    }
    25% {
      transform: translateY(-18px) translateX(6px) scale(1.3);
    }
    50% {
      transform: translateY(-6px) translateX(-4px) scale(0.8);
    }
    75% {
      transform: translateY(-24px) translateX(2px) scale(1.2);
    }
  }

  .animate-answer-card {
    animation: answer-card-float 3.8s ease-in-out infinite;
  }

  .confetti-dot {
    animation: confetti-drift 4.5s ease-in-out infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .animate-answer-card,
    .confetti-dot {
      animation: none;
    }
  }
</style>
