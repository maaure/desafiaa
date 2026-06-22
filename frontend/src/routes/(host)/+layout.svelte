<script lang="ts">
  import { auth } from "$lib/stores/auth.store";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import { page } from "$app/stores";

  let { children } = $props();
  let isAuthenticated = $state(get(auth.isAuthenticated));
  let pathname = $state("");

  onMount(() => {
    const unsubAuth = auth.isAuthenticated.subscribe(
      (v) => (isAuthenticated = v),
    );
    const unsubPage = page.subscribe((p) => (pathname = p.url.pathname));

    if (!isAuthenticated) {
      auth.tryRefresh().then((refreshed) => {
        if (!refreshed) goto("/login");
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

  function handleLogout() {
    auth.logout().then(() => goto("/login"));
  }
</script>

{#if isAuthenticated}
  <div class="flex h-screen overflow-hidden">
    <!-- Sidebar -->
    <aside
      class="w-56 shrink-0 bg-white border-r border-slate-200 flex flex-col"
    >
      <!-- Brand -->
      <div class="px-5 py-4 border-b border-slate-100">
        <a href="/dashboard" class="block">
          <span class="text-lg font-bold tracking-tight text-slate-900"
            >Desafia</span
          >
          <span class="block text-xs text-slate-400 mt-0.5 font-medium"
            >Painel do Host</span
          >
        </a>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-3 py-4 space-y-1">
        <a
          href="/dashboard"
          class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
            {isActive('/dashboard')
            ? 'bg-cyan-50 text-cyan-700'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}"
        >
          <svg
            class="w-4 h-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
            />
          </svg>
          Dashboard
        </a>

        <a
          href="/quiz/new"
          class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
            {isActive('/quiz/new')
            ? 'bg-cyan-50 text-cyan-700'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}"
        >
          <svg
            class="w-4 h-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          Novo Quiz
        </a>
      </nav>

      <!-- User footer -->
      <div class="border-t border-slate-100 px-3 py-3">
        <button
          onclick={handleLogout}
          class="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-red-500 transition-colors"
        >
          <svg
            class="w-4 h-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
            />
          </svg>
          Sair
        </button>
      </div>
    </aside>

    <!-- Main content -->
    <main class="flex-1 overflow-y-auto">
      {@render children()}
    </main>
  </div>
{/if}
