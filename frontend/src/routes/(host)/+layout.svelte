<script lang="ts">
  import { auth } from "$lib/stores/auth.store";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { get } from "svelte/store";

  let { children } = $props();
  let isAuthenticated = $state(get(auth.isAuthenticated));

  onMount(() => {
    const unsub = auth.isAuthenticated.subscribe(v => isAuthenticated = v);

    if (!isAuthenticated) {
      auth.tryRefresh().then(refreshed => {
        if (!refreshed) goto("/login");
      });
    }

    return unsub;
  });
</script>

{#if isAuthenticated}
  <nav>
    <a href="/dashboard">Dashboard</a>
    <a href="/quiz/new">Novo Quiz</a>
    <button onclick={() => auth.logout().then(() => goto("/login"))}>Sair</button>
  </nav>
{/if}

{@render children()}
