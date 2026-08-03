<script lang="ts">
  import { Globe, LayoutDashboard, LogOut, Menu, Plus, Radio, X } from "@lucide/svelte";
  import { auth } from "$lib/stores/auth.store";
  import { useQuizList } from "$lib/api/quizzes/quizzes.queries";
  import { useActiveSessions } from "$lib/api/sessions/sessions.queries";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import { page } from "$app/stores";

  let { children } = $props();
  let isAuthenticated = $state(get(auth.isAuthenticated));
  let user = $state(get(auth));
  let pathname = $state("");
  let mobileOpen = $state(false);

  // Contagens para badges do menu (queries deduplicadas com as páginas)
  const quizQuery = useQuizList();
  const activeQuery = useActiveSessions();

  // Iniciais do nome para o fallback do avatar (sem foto, contas email/senha)
  let initials = $derived.by(() => {
    if (!user?.name) return "?";
    return user.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("");
  });

  onMount(() => {
    const unsubAuth = auth.isAuthenticated.subscribe((v) => (isAuthenticated = v));
    const unsubUser = auth.subscribe((u) => (user = u));
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
      unsubUser();
      unsubPage();
    };
  });

  function isActive(route: string) {
    if (route === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(route);
  }

  // Quiz aberto no momento (/quiz/:id/edit ou /quiz/:id/report) → atalhos no menu.
  // Só aparece dentro da página do quiz — sai da edição, some do menu.
  let currentQuizId = $derived(pathname.match(/^\/quiz\/([^/]+)\/(edit|report)$/)?.[1] ?? null);

  // Sessão ao vivo: tela de aplicação de perguntas ocupa a tela toda, sem barra lateral
  let isLiveSession = $derived(/^\/session\/[^/]+\/host$/.test(pathname));

  let quizCount = $derived(quizQuery.data?.total ?? null);
  let activeCount = $derived(activeQuery.data?.length ?? null);

  function handleLogout() {
    auth.logout().then(() => goto(resolve("/login")));
  }
</script>

{#if isAuthenticated}
  {#if isLiveSession}
    <!-- Tela de sessão ao vivo: tela cheia, sem barra lateral nem cabeçalho mobile -->
    {@render children()}
  {:else}
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
          <!-- Quizzes: gestão (lista + criar) no mesmo grupo -->
          <div class="mb-5">
            <p
              class="px-3 pb-2 text-xs font-bold uppercase tracking-widest text-ink-faint flex items-center gap-2"
            >
              Quizzes
              {#if quizCount !== null}
                <span
                  class="inline-flex items-center justify-center min-w-5 px-1.5 h-5 rounded-full bg-sand-100 border-2 border-ink
                text-[10px] font-bold text-ink-faint">{quizCount}</span
                >
              {/if}
            </p>
            <a
              href={resolve("/dashboard")}
              class="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-semibold transition-colors
              {isActive('/dashboard')
                ? 'bg-ocean-500 text-white shadow-soft'
                : 'text-ink-soft hover:bg-sand-100 hover:text-ink'}"
            >
              <LayoutDashboard class="w-5 h-5 shrink-0" />
              Meus Quizzes
            </a>
            <a
              href={resolve("/quiz/new")}
              class="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-semibold transition-colors
              {isActive('/quiz/new')
                ? 'bg-ocean-500 text-white shadow-soft'
                : 'text-ink-soft hover:bg-sand-100 hover:text-ink-soft'}"
            >
              <Plus class="w-5 h-5 shrink-0" />
              Novo Quiz
            </a>
          </div>

          <!-- Ao vivo: sessões em andamento -->
          <div class="mb-5">
            <p
              class="px-3 pb-2 text-xs font-bold uppercase tracking-widest text-ink-faint flex items-center gap-2"
            >
              Ao Vivo
              {#if activeCount !== null && activeCount > 0}
                <span
                  class="inline-flex items-center justify-center min-w-5 px-1.5 h-5 rounded-full border-2 border-ink
                text-[10px] font-bold bg-mango-100 text-mango-800 animate-pulse-soft"
                  >{activeCount}</span
                >
              {/if}
            </p>
            <a
              href={resolve("/sessions")}
              class="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-semibold transition-colors
              {isActive('/sessions')
                ? 'bg-ocean-500 text-white shadow-soft'
                : 'text-ink-soft hover:bg-sand-100 hover:text-ink'}"
            >
              <Radio class="w-5 h-5 shrink-0" />
              Sessões ativas
            </a>
          </div>

          <!-- Comunidade: descoberta -->
          <div class="mb-5">
            <p class="px-3 pb-2 text-xs font-bold uppercase tracking-widest text-ink-faint">
              Comunidade
            </p>
            <a
              href={resolve("/quizzes/public")}
              class="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-semibold transition-colors
              {isActive('/quizzes/public')
                ? 'bg-ocean-500 text-white shadow-soft'
                : 'text-ink-soft hover:bg-sand-100 hover:text-ink'}"
            >
              <Globe class="w-5 h-5 shrink-0" />
              Quizzes Públicos
            </a>
          </div>
        </nav>

        <!-- User footer — identidade + sair -->
        <div class="border-t-2 border-ink px-4 py-4 space-y-1">
          {#if user}
            <div class="flex items-center gap-3 px-3 py-2" title={user.email}>
              {#if user.avatarUrl}
                <img
                  src={user.avatarUrl}
                  alt={`Foto de ${user.name}`}
                  class="w-9 h-9 shrink-0 rounded-full border-2 border-ink bg-sand-100 object-cover shadow-soft"
                />
              {:else}
                <span
                  class="w-9 h-9 shrink-0 rounded-full border-2 border-ink bg-secondary text-white flex items-center justify-center
                text-sm font-bold shadow-soft"
                >
                  {initials}
                </span>
              {/if}
              <div class="min-w-0 flex-1">
                <p class="text-sm font-bold text-ink truncate">{user.name}</p>
                <p class="text-xs text-ink-faint truncate">{user.email}</p>
              </div>
            </div>
          {/if}
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
{/if}
