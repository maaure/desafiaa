<script lang="ts">
  import { LayoutDashboard, LogOut, Plus } from "@lucide/svelte";
  import { auth } from "$lib/stores/auth.store";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import { page } from "$app/stores";

  let { children } = $props();
  let isAuthenticated = $state(get(auth.isAuthenticated));
  let pathname = $state("");

  onMount(() => {
    const unsubAuth = auth.isAuthenticated.subscribe((v) => (isAuthenticated = v));
    const unsubPage = page.subscribe((p) => (pathname = p.url.pathname));

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

  function handleLogout() {
    auth.logout().then(() => goto(resolve("/login")));
  }
</script>

{#if isAuthenticated}
  <div class="flex h-screen overflow-hidden">
    <!-- Sidebar -->
    <aside class="w-56 shrink-0 bg-white border-r border-slate-200 flex flex-col">
      <!-- Brand -->
      <div class="px-5 py-4 border-b border-slate-100">
        <a href={resolve("/dashboard")} class="block">
          <span class="text-lg font-bold tracking-tight text-slate-900">Desafia</span>
          <span class="block text-xs text-slate-400 mt-0.5 font-medium">Painel do Host</span>
        </a>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-3 py-4 space-y-1">
        <a
          href={resolve("/dashboard")}
          class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
            {isActive('/dashboard')
            ? 'bg-cyan-50 text-cyan-700'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}"
        >
          <LayoutDashboard class="w-4 h-4 shrink-0" />
          Dashboard
        </a>

        <a
          href={resolve("/quiz/new")}
          class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
            {isActive('/quiz/new')
            ? 'bg-cyan-50 text-cyan-700'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}"
        >
          <Plus class="w-4 h-4 shrink-0" />
          Novo Quiz
        </a>
      </nav>

      <!-- User footer -->
      <div class="border-t border-slate-100 px-3 py-3">
        <button
          onclick={handleLogout}
          class="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-red-500 transition-colors"
        >
          <LogOut class="w-4 h-4 shrink-0" />
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
