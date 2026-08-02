<script lang="ts">
  import { BarChart3, LayoutDashboard, LogOut, Menu, Pencil, Plus, Radio, X } from "@lucide/svelte";
  import { auth } from "$lib/stores/auth.store";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import { page } from "$app/stores";

  let { children } = $props();
  let isAuthenticated = $state(get(auth.isAuthenticated));
  let pathname = $state("");
  let mobileOpen = $state(false);

  onMount(() => {
    const unsubAuth = auth.isAuthenticated.subscribe((v) => (isAuthenticated = v));
    const unsubPage = page.subscribe((p) => {
      pathname = p.url.pathname;
      mobileOpen = false;
    });

    if (!isAuthenticated) {
      auth.tryRefresh().then((refreshed) => {
        if (!refreshed) goto(resolve("/login"));
      });
    }

    return () => {
      unsubAuth();
      unsubPage();
    };
  });

  function isActive(route: string) {
    if (route === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(route);
  }

  // Quiz aberto no momento (/quiz/:id/edit ou /quiz/:id/report) → atalhos no menu
  let currentQuizId = $derived(pathname.match(/^\/quiz\/([^/]+)\/(edit|report)$/)?.[1] ?? null);

  function handleLogout() {
    auth.logout().then(() => goto(resolve("/login")));
  }
</script>

{#if isAuthenticated}
  <div class="flex h-screen overflow-hidden">
    {#if mobileOpen}
      <button
        class="fixed inset-0 z-40 bg-black/50 md:hidden"
        onclick={() => (mobileOpen = false)}
        aria-label="Fechar menu"
      ></button>
    {/if}

    <aside
      class="fixed inset-y-0 left-0 z-50 w-64 bg-surface-raised border-r-2 border-ink flex flex-col transition-transform duration-200
        md:relative md:translate-x-0
        {mobileOpen ? 'translate-x-0' : '-translate-x-full'}"
    >
      <!-- Brand -->
      <div class="px-6 py-5 border-b-2 border-ink flex items-center justify-between">
        <a href={resolve("/dashboard")} class="block">
          <span class="font-display text-2xl font-extrabold tracking-tight text-ink"
            >Desafia<span class="text-primary">.</span></span
          >
          <span class="block text-sm text-ink-faint mt-0.5 font-medium">Painel do Host</span>
        </a>
        <button
          class="md:hidden p-1 rounded-lg text-ink-faint hover:text-ink hover:bg-sand-100"
          onclick={() => (mobileOpen = false)}
          aria-label="Fechar menu"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Navigation — agrupada por ação -->
      <nav class="flex-1 px-4 py-5 overflow-y-auto">
        <p class="px-3 pb-2 text-xs font-bold uppercase tracking-widest text-ink-faint">
          Meus Quizzes
        </p>
        <a
          href={resolve("/dashboard")}
          class="flex items-center gap-3 px-3 py-3 mb-5 rounded-xl text-base font-semibold transition-colors
            {isActive('/dashboard')
            ? 'bg-ocean-500 text-white shadow-soft'
            : 'text-ink-soft hover:bg-sand-100 hover:text-ink'}"
        >
          <LayoutDashboard class="w-5 h-5 shrink-0" />
          Dashboard
        </a>

        <p class="px-3 pb-2 text-xs font-bold uppercase tracking-widest text-ink-faint">Criar</p>
        <a
          href={resolve("/quiz/new")}
          class="flex items-center gap-3 px-3 py-3 mb-5 rounded-xl text-base font-semibold transition-colors
            {isActive('/quiz/new')
            ? 'bg-ocean-500 text-white shadow-soft'
            : 'text-ink-soft hover:bg-sand-100 hover:text-ink'}"
        >
          <Plus class="w-5 h-5 shrink-0" />
          Novo Quiz
        </a>

        <p class="px-3 pb-2 text-xs font-bold uppercase tracking-widest text-ink-faint">Jogar</p>
        <a
          href={resolve("/sessions")}
          class="flex items-center gap-3 px-3 py-3 mb-5 rounded-xl text-base font-semibold transition-colors
            {isActive('/sessions')
            ? 'bg-ocean-500 text-white shadow-soft'
            : 'text-ink-soft hover:bg-sand-100 hover:text-ink'}"
        >
          <Radio class="w-5 h-5 shrink-0" />
          Sessões ativas
        </a>

        {#if currentQuizId}
          <p class="px-3 pb-2 text-xs font-bold uppercase tracking-widest text-ink-faint">
            Quiz Atual
          </p>
          <a
            href={resolve(`/quiz/${currentQuizId}/edit`)}
            class="flex items-center gap-3 px-3 py-3 mb-1 rounded-xl text-base font-semibold transition-colors
              {isActive(`/quiz/${currentQuizId}/edit`)
              ? 'bg-ocean-500 text-white shadow-soft'
              : 'text-ink-soft hover:bg-sand-100 hover:text-ink'}"
          >
            <Pencil class="w-5 h-5 shrink-0" />
            Editar
          </a>
          <a
            href={resolve(`/quiz/${currentQuizId}/report`)}
            class="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-semibold transition-colors
              {isActive(`/quiz/${currentQuizId}/report`)
              ? 'bg-ocean-500 text-white shadow-soft'
              : 'text-ink-soft hover:bg-sand-100 hover:text-ink'}"
          >
            <BarChart3 class="w-5 h-5 shrink-0" />
            Relatório
          </a>
        {/if}
      </nav>

      <!-- User footer -->
      <div class="border-t-2 border-ink px-4 py-4">
        <button
          onclick={handleLogout}
          class="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-base font-semibold text-ink-soft hover:bg-tomato-50 hover:text-danger transition-colors"
        >
          <LogOut class="w-5 h-5 shrink-0" />
          Sair
        </button>
      </div>
    </aside>

    <!-- Main content -->
    <main class="flex-1 overflow-y-auto">
      <div
        class="flex items-center gap-3 px-4 py-3 border-b-2 border-ink bg-surface-raised md:hidden"
      >
        <button
          onclick={() => (mobileOpen = true)}
          class="p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-sand-100"
          aria-label="Abrir menu"
        >
          <Menu class="w-5 h-5" />
        </button>
        <span class="font-display text-base font-bold text-ink">Desafia</span>
      </div>

      {@render children()}
    </main>
  </div>
{/if}
