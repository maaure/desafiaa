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
    GraduationCap,
    Presentation,
    Briefcase,
    PartyPopper,
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
      desc: "Perguntas de múltipla escolha ou verdadeiro ou falso, prontas em minutos. Revisar a matéria, testar a turma ou só brincar? Você decide.",
      color: "coral" as const,
    },
    {
      icon: Share2,
      title: "Compartilhe o PIN",
      desc: "Abra a sessão e mostre o PIN para a galera. Cada um entra pelo celular, sem cadastro e sem instalar nada.",
      color: "mango" as const,
    },
    {
      icon: Zap,
      title: "Jogue ao vivo",
      desc: "As perguntas aparecem para todo mundo ao mesmo tempo. Quem responde mais rápido soma mais pontos, e o pódio coroa o campeão.",
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
      title: "Crie seu quiz em minutos",
      desc: "Perguntas de múltipla escolha ou verdadeiro ou falso com gabarito. Simples assim: do zero ao jogo pronto na hora.",
      color: "coral" as const,
    },
    {
      icon: Users,
      title: "Você no comando",
      desc: "Veja a plateia chegando ao vivo e avance as perguntas no seu ritmo. A energia do jogo está nas suas mãos.",
      color: "mango" as const,
    },
    {
      icon: Trophy,
      title: "Competição de verdade",
      desc: "O ranking muda a cada resposta e esquenta o clima. No final, o pódio coroa os melhores da noite.",
      color: "leaf" as const,
    },
    {
      icon: BarChart3,
      title: "Você aprende com o jogo",
      desc: "Ao final, veja como cada pergunta foi respondida. O jeito mais leve de descobrir o que ninguém dominou.",
      color: "ocean" as const,
    },
  ];

  const playerFeatures = [
    {
      icon: Play,
      title: "Entrar é só digitar o PIN",
      desc: "Sem cadastro, sem instalar nada. Abre o navegador do celular e pronto: você está no jogo.",
      color: "coral" as const,
    },
    {
      icon: Zap,
      title: "Velocidade vale pontos",
      desc: "As perguntas chegam para todo mundo ao mesmo tempo. Quanto antes você responder, mais pontos embolsa.",
      color: "mango" as const,
    },
    {
      icon: Timer,
      title: "Tensão e resposta na hora",
      desc: "Acertou ou errou, você vê na hora quanto pontuou e onde está no ranking. A disputa nunca para.",
      color: "leaf" as const,
    },
    {
      icon: ShieldCheck,
      title: "Conexão caiu? Sem drama",
      desc: "Seus pontos e seu apelido ficam salvos. É só reconectar e voltar para a disputa.",
      color: "ocean" as const,
    },
  ];

  const audiences = [
    {
      icon: GraduationCap,
      title: "Professores",
      desc: "Revisão de prova e gincana de conteúdo: a turma sai da aula jogando e aprendendo.",
      color: "coral" as const,
    },
    {
      icon: Presentation,
      title: "Apresentadores",
      desc: "Esquente a plateia, quebre o gelo e mantenha todo mundo ligado no que você tem a dizer.",
      color: "mango" as const,
    },
    {
      icon: Briefcase,
      title: "Empresas",
      desc: "Treinamento e integração com clima de competição. Todo mundo participa, ninguém dorme no ponto.",
      color: "leaf" as const,
    },
    {
      icon: PartyPopper,
      title: "Encontros",
      desc: "Happy hour, aniversário ou a noite de domingo: qualquer reunião vira um game show entre amigos.",
      color: "ocean" as const,
    },
  ];
</script>

<svelte:head>
  <title>Desafia: sua aula, reunião ou festa viram um game show</title>
  <meta
    name="description"
    content="Crie quizzes em minutos e desafie sua plateia a jogar ao vivo pelo celular. Sem instalar nada, professores, apresentadores e amigos já estão jogando."
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
        href={resolve("/login")}
        class="hidden md:inline-flex px-4 py-2 text-sm font-semibold text-ink-soft hover:text-ink hover:bg-sand-100 rounded-lg transition-colors"
      >
        Entrar
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
          Quizzes ao vivo, game show garantido
        </span>
      </div>

      <h1
        class="font-display text-4xl lg:text-5xl xl:text-6xl font-extrabold text-ink leading-[1.06] tracking-tight"
      >
        Sua aula, sua reunião ou sua festa viram um <span class="text-primary">game show</span>
      </h1>

      <p class="mt-6 text-lg text-ink-soft leading-relaxed max-w-xl">
        Crie perguntas em minutos e desafie sua plateia a jogar ao vivo pelo celular.
        <strong class="text-ink">Todo mundo participa, ninguém fica de fora.</strong>
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
        Grátis para começar · Sem instalar nada · Funciona em qualquer celular
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
        Pronto para jogar em três passos simples.
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
        Duas formas de jogar, uma só diversão
      </h2>
      <p class="mt-4 text-lg text-ink-soft max-w-xl mx-auto">
        Tudo para quem apresenta e para quem joga, em um só lugar.
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
          <h3 class="font-display text-xl font-bold text-ink">Para quem apresenta</h3>
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
          <h3 class="font-display text-xl font-bold text-ink">Para quem joga</h3>
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
<!--  PARA QUEM                                   -->
<!-- ════════════════════════════════════════════ -->
<section class="bg-ocean-950 border-y-[3px] border-ink relative overflow-hidden">
  <!-- Orbes decorativas -->
  <div class="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-ocean-500/10 blur-3xl"></div>
  <div class="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-coral-400/10 blur-3xl"></div>

  <div class="relative mx-auto max-w-7xl px-6 py-20">
    <div class="text-center mb-14">
      <h2 class="font-display text-3xl font-extrabold text-white tracking-tight">
        Feito para qualquer ocasião
      </h2>
      <p class="mt-4 text-lg text-ocean-200 max-w-xl mx-auto">
        Se tem plateia, tem jogo. Escolha o seu cenário.
      </p>
    </div>

    <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {#each audiences as audience (audience.title)}
        <div class="bg-ocean-900 border-2 border-ink rounded-2xl p-6 text-center shadow-soft">
          <div
            class="w-12 h-12 mx-auto flex items-center justify-center {colorMap[audience.color]
              .light} border-2 border-ink rounded-lg mb-4"
          >
            <audience.icon class="w-6 h-6 {colorMap[audience.color].text}" />
          </div>
          <h3 class="font-display text-lg font-bold text-white mb-2">{audience.title}</h3>
          <p class="text-sm text-ocean-200 leading-relaxed">{audience.desc}</p>
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
      Pronto para transformar sua próxima reunião
      <span class="text-primary">em uma competição?</span>
    </h2>
    <p class="mt-4 text-lg text-ink-soft max-w-lg mx-auto">
      Crie sua conta grátis, monte seu primeiro quiz em minutos e veja todo mundo entrar no jogo.
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

    <p class="mt-8 text-sm text-ink-faint">
      <a
        href={resolve("/login")}
        class="font-semibold text-ink-soft hover:text-ink underline underline-offset-4 transition-colors"
      >
        Já tem conta? Entrar
      </a>
    </p>
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
        Entrar
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
