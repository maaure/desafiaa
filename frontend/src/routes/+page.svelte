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

  // ── The four answer colors — same ones players see during a game ──
  const answerColors = [
    { letter: "A", bg: "bg-rose-500", hex: "#F43F5E", shadow: "rgba(244,63,94,0.35)" },
    { letter: "B", bg: "bg-amber-500", hex: "#F59E0B", shadow: "rgba(245,158,11,0.35)" },
    { letter: "C", bg: "bg-emerald-500", hex: "#10B981", shadow: "rgba(16,185,129,0.35)" },
    { letter: "D", bg: "bg-violet-500", hex: "#8B5CF6", shadow: "rgba(139,92,246,0.35)" },
  ];

  const steps = [
    {
      icon: Pencil,
      title: "Crie seu quiz",
      desc: "Monte questionários com perguntas de múltipla escolha ou verdadeiro/falso. Defina pontuações e gabaritos com um editor rápido e intuitivo.",
      color: "rose" as const,
    },
    {
      icon: Share2,
      title: "Compartilhe o PIN",
      desc: "Ao iniciar uma sessão, um PIN de 6 dígitos é gerado. Compartilhe com seus participantes e veja todos entrarem no lobby em tempo real.",
      color: "amber" as const,
    },
    {
      icon: Zap,
      title: "Jogue ao vivo",
      desc: "Avance as perguntas, acompanhe as respostas chegando e veja o ranking se formar. Ao final, o pódio revela os vencedores.",
      color: "emerald" as const,
    },
  ];

  const colorMap = {
    rose: {
      light: "bg-rose-50 border-rose-200",
      text: "text-rose-600",
      accent: "border-rose-500",
      glow: "shadow-[0_0_24px_rgba(244,63,94,0.15)]",
    },
    amber: {
      light: "bg-amber-50 border-amber-200",
      text: "text-amber-600",
      accent: "border-amber-500",
      glow: "shadow-[0_0_24px_rgba(245,158,11,0.15)]",
    },
    emerald: {
      light: "bg-emerald-50 border-emerald-200",
      text: "text-emerald-600",
      accent: "border-emerald-500",
      glow: "shadow-[0_0_24px_rgba(16,185,129,0.15)]",
    },
    violet: {
      light: "bg-violet-50 border-violet-200",
      text: "text-violet-600",
      accent: "border-violet-500",
      glow: "shadow-[0_0_24px_rgba(139,92,246,0.15)]",
    },
  };

  const hostFeatures = [
    {
      icon: FileQuestion,
      title: "Editor intuitivo de quizzes",
      desc: "Crie perguntas de múltipla escolha ou verdadeiro/falso com gabarito e pontuação personalizada em minutos.",
      color: "rose" as const,
    },
    {
      icon: Users,
      title: "Controle total da sessão",
      desc: "Abra o lobby, veja os participantes chegando em tempo real e avance as perguntas no seu ritmo.",
      color: "amber" as const,
    },
    {
      icon: Trophy,
      title: "Leaderboard em tempo real",
      desc: "Ranking atualizado a cada pergunta. Destaque visual para mudanças de posição e pódio final completo.",
      color: "emerald" as const,
    },
    {
      icon: BarChart3,
      title: "Relatórios detalhados",
      desc: "Taxa de acerto por pergunta, tempo médio de resposta, questões mais difíceis e histórico de sessões.",
      color: "violet" as const,
    },
  ];

  const playerFeatures = [
    {
      icon: Play,
      title: "Entre com um PIN de 6 dígitos",
      desc: "Sem cadastro, sem instalar nada. Acesse pelo navegador do celular ou computador e participe na hora.",
      color: "rose" as const,
    },
    {
      icon: Zap,
      title: "Respostas em tempo real",
      desc: "As perguntas aparecem simultaneamente para todos. Quanto mais rápido você responde, mais pontos ganha.",
      color: "amber" as const,
    },
    {
      icon: Timer,
      title: "Feedback imediato",
      desc: "Veja na hora se acertou ou errou, quantos pontos ganhou e sua pontuação total acumulada na partida.",
      color: "emerald" as const,
    },
    {
      icon: ShieldCheck,
      title: "Reconexão automática",
      desc: "Perdeu a conexão? Seus pontos e apelido estão salvos. Reconecte em até 30 segundos e continue jogando.",
      color: "violet" as const,
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
<nav class="sticky top-0 z-50 bg-white border-b border-slate-200">
  <div class="mx-auto max-w-7xl flex h-16 items-center justify-between px-6">
    <a href="/" class="flex items-center gap-2">
      <span class="flex items-center justify-center w-8 h-8 bg-violet-600">
        <Gamepad2 class="w-4.5 h-4.5 text-white" />
      </span>
      <span class="text-xl font-extrabold tracking-tight text-slate-900">
        Desafia<span class="text-violet-500">.</span>
      </span>
    </a>

    <div class="hidden md:flex items-center gap-8">
      <a href="#funcionalidades" class="text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors">
        Funcionalidades
      </a>
      <a href="#como-funciona" class="text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors">
        Como funciona
      </a>
    </div>

    <div class="flex items-center gap-3">
      <a
        href={resolve("/play")}
        class="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700
        hover:text-slate-900 hover:bg-slate-100 transition-colors"
      >
        <Play class="w-3.5 h-3.5" />
        Entrar em jogo
      </a>
      <a
        href={resolve("/register")}
        class="inline-flex items-center gap-2 bg-violet-600 text-white px-5 py-2.5 text-sm font-bold
        hover:bg-violet-700 active:bg-violet-800 transition-colors shadow-[0_2px_8px_rgba(124,58,237,0.3)]"
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
<section class="relative overflow-hidden bg-white">
  <!-- Subtle dot pattern background -->
  <div
    class="absolute inset-0 opacity-[0.04]"
    style="background-image: radial-gradient(circle, #7c3aed 1.2px, transparent 1.2px); background-size: 32px 32px;"
  ></div>

  <div class="relative mx-auto max-w-7xl px-6 py-24 lg:py-32 lg:grid lg:grid-cols-2 lg:gap-16 items-center">
    <!-- Left: Text -->
    <div class="animate-slide-up">
      <!-- Badge -->
      <div
        class="inline-flex items-center gap-2 bg-violet-50 border border-violet-200 px-3.5 py-1.5 mb-8"
      >
        <Sparkles class="w-3.5 h-3.5 text-violet-500" />
        <span class="text-xs font-bold text-violet-700 tracking-wide uppercase">
          Plataforma de quizzes em tempo real
        </span>
      </div>

      <h1
        class="text-4xl lg:text-5xl xl:text-6xl font-extrabold text-slate-900 leading-[1.06] tracking-tight"
      >
        A maneira mais
        <span class="text-violet-600">divertida</span>
        de engajar qualquer audiência
      </h1>

      <p class="mt-6 text-lg text-slate-500 leading-relaxed max-w-xl">
        Crie quizzes interativos em minutos, compartilhe um PIN de 6 dígitos e veja dezenas de
        pessoas competirem em tempo real — <strong class="text-slate-700">como um game show, na sua sala.</strong>
      </p>

      <div class="mt-10 flex flex-col sm:flex-row gap-3">
        <a
          href={resolve("/register")}
          class="inline-flex items-center justify-center gap-2 bg-violet-600
          text-white px-7 py-3.5 text-base font-bold hover:bg-violet-700
          active:bg-violet-800 transition-all shadow-[0_4px_16px_rgba(124,58,237,0.3)]
          hover:shadow-[0_6px_24px_rgba(124,58,237,0.4)]"
        >
          Criar conta grátis
          <ArrowRight class="w-4 h-4" />
        </a>
        <a
          href={resolve("/play")}
          class="inline-flex items-center justify-center gap-2 border-2 border-slate-200 text-slate-700
          px-7 py-3.5 text-base font-bold hover:bg-slate-50 hover:border-slate-300 transition-colors"
        >
          <Play class="w-4 h-4" />
          Entrar em um jogo
        </a>
      </div>

      <p class="mt-6 text-sm text-slate-400">
        Sem compromisso. Crie sua conta e comece a usar em menos de 2 minutos.
      </p>
    </div>

    <!-- Right: Colorful Answer Grid + Confetti -->
    <div class="hidden lg:flex items-center justify-center relative mt-16 lg:mt-0" aria-hidden="true">
      <!-- Confetti dots -->
      <div class="absolute inset-0 pointer-events-none">
        {#each Array(16) as _, i}
          {@const cx = answerColors[i % 4]}
          {@const x = 15 + (i * 37) % 90}
          {@const y = 8 + (i * 53) % 85}
          {@const size = 4 + (i % 3) * 3}
          {@const delay = (i * 0.35) % 3.5}
          <div
            class="absolute rounded-full confetti-dot"
            style="left: {x}%; top: {y}%; width: {size}px; height: {size}px; background-color: {cx.hex}; animation-delay: {delay}s; opacity: 0.45;"
          ></div>
        {/each}
      </div>

      <!-- 2x2 Answer Grid -->
      <div class="relative grid grid-cols-2 gap-5 w-[300px] h-[300px]">
        {#each answerColors as card, i}
          <div
            class="flex items-center justify-center {card.bg} border-2 border-transparent animate-answer-card relative"
            style="animation-delay: {i * 0.12}s; box-shadow: 0 8px 24px {card.shadow};"
          >
            <span class="text-6xl font-extrabold text-white drop-shadow-sm">{card.letter}</span>
          </div>
        {/each}
      </div>
    </div>
  </div>
</section>

<!-- ════════════════════════════════════════════ -->
<!--  COMO FUNCIONA                             -->
<!-- ════════════════════════════════════════════ -->
<section id="como-funciona" class="bg-slate-50">
  <div class="mx-auto max-w-7xl px-6 py-24">
    <div class="text-center mb-16">
      <h2 class="text-3xl font-extrabold text-slate-900 tracking-tight">
        Como funciona
      </h2>
      <p class="mt-4 text-lg text-slate-500 max-w-xl mx-auto">
        Do quiz pronto ao pódio final em três passos simples.
      </p>
    </div>

    <div class="grid sm:grid-cols-3 gap-8">
      {#each steps as step}
        <div
          class="bg-white border border-slate-200 p-8 relative overflow-hidden group
          hover:{colorMap[step.color].glow} transition-shadow"
        >
          <!-- Colored top accent line -->
          <div class="absolute top-0 left-0 right-0 h-1 {step.color === 'rose' ? 'bg-rose-500' : step.color === 'amber' ? 'bg-amber-500' : step.color === 'emerald' ? 'bg-emerald-500' : 'bg-violet-500'}"></div>

          <!-- Icon in colored box -->
          <div
            class="w-12 h-12 flex items-center justify-center {colorMap[step.color].light} border mb-6"
          >
            <step.icon class="w-6 h-6 {colorMap[step.color].text}" />
          </div>

          <h3 class="text-lg font-bold text-slate-900 mb-3">
            <span class="{colorMap[step.color].text}">{steps.indexOf(step) + 1}.</span>
            {step.title}
          </h3>
          <p class="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
        </div>
      {/each}
    </div>
  </div>
</section>

<!-- ════════════════════════════════════════════ -->
<!--  FUNCIONALIDADES                            -->
<!-- ════════════════════════════════════════════ -->
<section id="funcionalidades" class="bg-white">
  <div class="mx-auto max-w-7xl px-6 py-24">
    <div class="text-center mb-16">
      <h2 class="text-3xl font-extrabold text-slate-900 tracking-tight">
        Tudo que você precisa para engajar
      </h2>
      <p class="mt-4 text-lg text-slate-500 max-w-xl mx-auto">
        Ferramentas pensadas tanto para quem apresenta quanto para quem participa.
      </p>
    </div>

    <div class="grid lg:grid-cols-2 gap-12">
      <!-- Host features -->
      <div>
        <div class="flex items-center gap-3 mb-8">
          <div class="w-10 h-10 flex items-center justify-center bg-violet-600">
            <Trophy class="w-5 h-5 text-white" />
          </div>
          <h3 class="text-xl font-bold text-slate-900">Para Apresentadores</h3>
        </div>

        <div class="space-y-4">
          {#each hostFeatures as feature}
            <div
              class="flex gap-4 p-4 border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-colors group"
            >
              <div
                class="w-10 h-10 shrink-0 flex items-center justify-center {colorMap[feature.color].light} border"
              >
                <feature.icon class="w-5 h-5 {colorMap[feature.color].text}" />
              </div>
              <div>
                <h4 class="text-sm font-bold text-slate-900 mb-1">{feature.title}</h4>
                <p class="text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <!-- Player features -->
      <div>
        <div class="flex items-center gap-3 mb-8">
          <div class="w-10 h-10 flex items-center justify-center bg-emerald-500">
            <Users class="w-5 h-5 text-white" />
          </div>
          <h3 class="text-xl font-bold text-slate-900">Para Participantes</h3>
        </div>

        <div class="space-y-4">
          {#each playerFeatures as feature}
            <div
              class="flex gap-4 p-4 border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-colors group"
            >
              <div
                class="w-10 h-10 shrink-0 flex items-center justify-center {colorMap[feature.color].light} border"
              >
                <feature.icon class="w-5 h-5 {colorMap[feature.color].text}" />
              </div>
              <div>
                <h4 class="text-sm font-bold text-slate-900 mb-1">{feature.title}</h4>
                <p class="text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
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
<section class="bg-slate-900 relative overflow-hidden">
  <!-- Decorative gradient orbs -->
  <div class="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-violet-500/10 blur-3xl"></div>
  <div class="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-rose-500/10 blur-3xl"></div>

  <div class="relative mx-auto max-w-7xl px-6 py-20">
    <div class="grid sm:grid-cols-3 gap-[1px] bg-white/10">
      {#each stats as stat}
        <div class="bg-slate-900/80 backdrop-blur-sm p-10 text-center">
          <div class="text-5xl font-extrabold text-white tracking-tight mb-3">
            {stat.value}
          </div>
          <p class="text-sm text-slate-400 leading-relaxed max-w-[200px] mx-auto">
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
<section class="bg-white border-t border-slate-200 relative overflow-hidden">
  <div class="mx-auto max-w-7xl px-6 py-24 text-center relative">
    <h2 class="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
      Pronto para transformar sua audiência
      <span class="text-violet-600">em competidores?</span>
    </h2>
    <p class="mt-4 text-lg text-slate-500 max-w-lg mx-auto">
      Crie sua conta gratuita, monte seu primeiro quiz e veja o engajamento acontecer ao vivo.
    </p>
    <div class="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
      <a
        href={resolve("/register")}
        class="inline-flex items-center gap-2 bg-violet-600 text-white
        px-8 py-3.5 text-base font-bold hover:bg-violet-700
        active:bg-violet-800 transition-all
        shadow-[0_4px_20px_rgba(124,58,237,0.35)] hover:shadow-[0_6px_28px_rgba(124,58,237,0.45)]"
      >
        Criar conta grátis
        <ArrowRight class="w-4 h-4" />
      </a>
      <a
        href={resolve("/play")}
        class="inline-flex items-center gap-2 border-2 border-slate-200 text-slate-700 px-8 py-3.5
        text-base font-bold hover:bg-slate-50 hover:border-slate-300 transition-colors"
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
<footer class="bg-slate-50 border-t border-slate-200">
  <div
    class="mx-auto max-w-7xl px-6 py-12 flex flex-col sm:flex-row items-center justify-between gap-6"
  >
    <a href="/" class="flex items-center gap-2">
      <span class="flex items-center justify-center w-7 h-7 bg-violet-600">
        <Gamepad2 class="w-4 h-4 text-white" />
      </span>
      <span class="text-lg font-extrabold text-slate-900 tracking-tight">
        Desafia<span class="text-violet-500">.</span>
      </span>
    </a>

    <div class="flex items-center gap-8 text-sm text-slate-400">
      <a href={resolve("/login")} class="hover:text-slate-600 transition-colors font-medium">
        Acessar painel
      </a>
      <a href={resolve("/register")} class="hover:text-slate-600 transition-colors font-medium">
        Criar conta
      </a>
      <a href={resolve("/play")} class="hover:text-slate-600 transition-colors font-medium">
        Entrar em jogo
      </a>
    </div>

    <p class="text-sm text-slate-400">
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
