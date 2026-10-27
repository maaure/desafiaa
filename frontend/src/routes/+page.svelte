<script lang="ts">
  import { resolve } from "$app/paths";
  import { ArrowRight, Play, Gamepad2 } from "@lucide/svelte";

  // Cartolina só no que é objeto: botões e a pergunta do hero. O resto é tipografia.
  const ctaPrimary =
    "inline-flex items-center justify-center gap-2 bg-primary text-white font-bold rounded-lg border-2 border-ink shadow-soft hover:bg-primary-hover active:bg-coral-800 active:translate-y-[2px] active:shadow-none transition-all";
  const ctaGhost =
    "inline-flex items-center justify-center gap-2 bg-surface-raised text-ink-soft font-bold rounded-lg border-2 border-ink shadow-soft hover:bg-sand-50 active:translate-y-[2px] active:shadow-none transition-all";

  // A pergunta do hero é a tela real do Participante, com as cores A–D do jogo
  const demoAnswers = [
    { letter: "A", text: "Terra", bg: "bg-answer-a" },
    { letter: "B", text: "Júpiter", bg: "bg-answer-b" },
    { letter: "C", text: "Marte", bg: "bg-answer-c" },
    { letter: "D", text: "Saturno", bg: "bg-answer-d" },
  ];

  const steps = [
    {
      title: "Crie seu quiz",
      desc: "Perguntas de múltipla escolha ou verdadeiro ou falso, prontas em minutos. Revisar a matéria, testar a turma ou só brincar? Você decide.",
      color: "text-answer-a",
    },
    {
      title: "Compartilhe o PIN",
      desc: "Abra a sessão e mostre o PIN para a galera. Cada um entra pelo celular, sem cadastro e sem instalar nada.",
      color: "text-answer-b",
    },
    {
      title: "Jogue ao vivo",
      desc: "As perguntas aparecem para todo mundo ao mesmo tempo. Quem responde mais rápido soma mais pontos, e o pódio coroa o campeão.",
      color: "text-answer-c",
    },
  ];

  const hostFeatures = [
    {
      title: "Você no comando",
      desc: "Veja a plateia chegando ao vivo e avance as perguntas no seu ritmo. A energia do jogo está nas suas mãos.",
    },
    {
      title: "Competição de verdade",
      desc: "O ranking muda a cada resposta e esquenta o clima. No final, o pódio coroa os melhores da noite.",
    },
    {
      title: "Você aprende com o jogo",
      desc: "Ao final, veja como cada pergunta foi respondida. O jeito mais leve de descobrir o que ninguém dominou.",
    },
  ];

  const playerFeatures = [
    {
      title: "Velocidade vale pontos",
      desc: "As perguntas chegam para todo mundo ao mesmo tempo. Quanto antes você responder, mais pontos embolsa.",
    },
    {
      title: "Resultado na hora",
      desc: "Acertou ou errou, você vê na hora quanto pontuou e onde está no ranking. A disputa nunca para.",
    },
    {
      title: "Conexão caiu? Sem drama",
      desc: "Seus pontos e seu apelido ficam salvos. É só reconectar e voltar para a disputa.",
    },
  ];

  const audiences = [
    {
      title: "Professores",
      desc: "Revisão de prova e gincana de conteúdo: a turma sai da aula jogando e aprendendo.",
    },
    {
      title: "Apresentadores",
      desc: "Esquente a plateia, quebre o gelo e mantenha todo mundo ligado no que você tem a dizer.",
    },
    {
      title: "Empresas",
      desc: "Treinamento e integração com clima de competição. Todo mundo participa, ninguém dorme no ponto.",
    },
    {
      title: "Encontros",
      desc: "Happy hour, aniversário ou a noite de domingo: qualquer reunião vira um game show entre amigos.",
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

<!-- NAV -->
<nav class="sticky top-0 z-50 bg-surface-raised border-b-2 border-ink">
  <div class="mx-auto max-w-6xl flex h-16 items-center justify-between px-6">
    <a href={resolve("/")} class="flex items-center gap-2">
      <span
        class="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary border-2 border-ink shadow-soft"
      >
        <Gamepad2 class="w-4.5 h-4.5 text-white" />
      </span>
      <span class="font-display text-xl font-extrabold tracking-tight text-ink">
        Desafia<span class="text-primary">.</span>
      </span>
    </a>

    <div class="flex items-center gap-2 sm:gap-6">
      <a
        href={resolve("/play")}
        class="hidden sm:inline text-sm font-semibold text-ink-soft hover:text-ink transition-colors"
      >
        Entrar em jogo
      </a>
      <a
        href={resolve("/login")}
        class="hidden sm:inline text-sm font-semibold text-ink-soft hover:text-ink transition-colors"
      >
        Entrar
      </a>
      <a href={resolve("/register")} class="{ctaPrimary} px-5 py-2.5 text-sm">
        Criar conta grátis
      </a>
    </div>
  </div>
</nav>

<!-- HERO -->
<section class="relative overflow-hidden bg-surface-raised">
  <div class="absolute inset-0 paper-dots opacity-40"></div>

  <div
    class="relative mx-auto max-w-6xl px-6 py-20 lg:py-28 grid lg:grid-cols-[1.15fr_1fr] gap-16 items-center"
  >
    <div class="animate-slide-up">
      <h1
        class="font-display text-4xl lg:text-5xl xl:text-6xl font-extrabold text-ink leading-[1.06] tracking-tight"
      >
        Sua aula, sua reunião ou sua festa viram um <span class="text-primary">game show</span>
      </h1>

      <p class="mt-6 text-lg text-ink-soft leading-relaxed max-w-xl">
        Crie perguntas em minutos e desafie sua plateia a jogar ao vivo pelo celular. Todo mundo
        participa, ninguém fica de fora.
      </p>

      <div class="mt-10 flex flex-col sm:flex-row gap-3">
        <a href={resolve("/register")} class="{ctaPrimary} px-7 py-3.5 text-base">
          Criar conta grátis
          <ArrowRight class="w-4 h-4" />
        </a>
        <a href={resolve("/play")} class="{ctaGhost} px-7 py-3.5 text-base">
          <Play class="w-4 h-4" />
          Entrar em um jogo
        </a>
      </div>

      <p class="mt-6 text-sm text-ink-faint">
        Grátis para começar. Sem instalar nada. Funciona em qualquer celular.
      </p>
    </div>

    <!-- O único objeto de palco da página: a pergunta como o Participante vê -->
    <div
      class="w-full max-w-md mx-auto lg:mx-0 lg:justify-self-end bg-surface-raised border-[3px] border-ink rounded-2xl shadow-lift p-5 sm:p-6 rotate-1"
      aria-hidden="true"
    >
      <div class="flex items-baseline justify-between text-sm text-ink-faint">
        <span>Pergunta 3 de 10</span>
        <span class="font-mono font-bold text-secondary">12s</span>
      </div>
      <p class="mt-3 font-display text-2xl font-bold text-ink leading-tight">
        Qual é o maior planeta do Sistema Solar?
      </p>
      <div class="mt-6 grid grid-cols-2 gap-3">
        {#each demoAnswers as answer (answer.letter)}
          <div
            class="{answer.bg} min-h-16 flex items-center gap-2 px-4 rounded-xl border-2 border-ink shadow-soft font-display text-lg font-bold text-white"
          >
            <span class="opacity-75">{answer.letter}</span>
            {answer.text}
          </div>
        {/each}
      </div>
    </div>
  </div>
</section>

<!-- COMO FUNCIONA -->
<section id="como-funciona" class="bg-surface">
  <div class="mx-auto max-w-6xl px-6 py-24">
    <h2 class="font-display text-3xl font-extrabold text-ink tracking-tight">
      Pronto para jogar em três passos
    </h2>

    <ol class="mt-14 grid sm:grid-cols-3 gap-12">
      {#each steps as step, i (step.title)}
        <li>
          <span class="block font-display text-hero font-extrabold {step.color}">{i + 1}</span>
          <h3 class="mt-4 font-display text-xl font-bold text-ink">{step.title}</h3>
          <p class="mt-2 text-ink-soft leading-relaxed">{step.desc}</p>
        </li>
      {/each}
    </ol>
  </div>
</section>

<!-- FUNCIONALIDADES -->
<section class="bg-surface-raised">
  <div class="mx-auto max-w-6xl px-6 py-24">
    <h2 class="font-display text-3xl font-extrabold text-ink tracking-tight max-w-2xl">
      Duas formas de jogar, uma só diversão
    </h2>

    <div class="mt-14 grid lg:grid-cols-2 gap-x-20 gap-y-14">
      {#each [{ heading: "Para quem apresenta", items: hostFeatures }, { heading: "Para quem joga", items: playerFeatures }] as group (group.heading)}
        <div>
          <h3 class="font-display text-2xl font-bold text-secondary">{group.heading}</h3>
          <dl class="mt-8 space-y-8">
            {#each group.items as feature (feature.title)}
              <div>
                <dt class="font-bold text-ink">{feature.title}</dt>
                <dd class="mt-1 text-ink-soft leading-relaxed">{feature.desc}</dd>
              </div>
            {/each}
          </dl>
        </div>
      {/each}
    </div>
  </div>
</section>

<!-- PARA QUEM -->
<section class="bg-surface">
  <div class="mx-auto max-w-6xl px-6 py-24">
    <h2 class="font-display text-3xl font-extrabold text-ink tracking-tight">
      Se tem plateia, tem jogo
    </h2>

    <div class="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-12">
      {#each audiences as audience (audience.title)}
        <div>
          <h3 class="font-display text-xl font-bold text-ink">{audience.title}</h3>
          <p class="mt-2 text-ink-soft leading-relaxed">{audience.desc}</p>
        </div>
      {/each}
    </div>
  </div>
</section>

<!-- CTA FINAL -->
<section class="bg-primary-soft border-y-2 border-ink">
  <div class="mx-auto max-w-6xl px-6 py-24">
    <h2
      class="font-display text-3xl lg:text-5xl font-extrabold text-ink tracking-tight leading-[1.08] max-w-3xl"
    >
      Sua próxima reunião pode ser uma competição.
    </h2>
    <p class="mt-5 text-lg text-ink-soft max-w-xl">
      Crie sua conta grátis, monte seu primeiro quiz em minutos e veja todo mundo entrar no jogo.
    </p>
    <div class="mt-10 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
      <a href={resolve("/register")} class="{ctaPrimary} px-8 py-3.5 text-base">
        Criar conta grátis
        <ArrowRight class="w-4 h-4" />
      </a>
      <a
        href={resolve("/login")}
        class="text-center font-semibold text-ink-soft hover:text-ink underline underline-offset-4 transition-colors"
      >
        Já tem conta? Entrar
      </a>
    </div>
  </div>
</section>

<!-- FOOTER -->
<footer class="bg-surface">
  <div
    class="mx-auto max-w-6xl px-6 py-12 flex flex-col sm:flex-row items-center justify-between gap-6"
  >
    <span class="font-display text-lg font-extrabold text-ink tracking-tight">
      Desafia<span class="text-primary">.</span>
    </span>

    <div class="flex items-center gap-8 text-sm text-ink-faint">
      <a href={resolve("/play")} class="hover:text-ink-soft transition-colors font-medium">
        Entrar em jogo
      </a>
      <a href={resolve("/login")} class="hover:text-ink-soft transition-colors font-medium">
        Entrar
      </a>
      <a href={resolve("/register")} class="hover:text-ink-soft transition-colors font-medium">
        Criar conta
      </a>
    </div>

    <p class="text-sm text-ink-faint">&copy; {new Date().getFullYear()} Desafia</p>
  </div>
</footer>
