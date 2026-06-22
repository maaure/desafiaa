<script lang="ts">
  import { auth } from "$lib/stores/auth.store";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";

  let email = $state("");
  let password = $state("");
  let error = $state<string | null>(null);
  let loading = $state(false);

  onMount(() => {
    const unsub1 = auth.error.subscribe(v => error = v);
    const unsub2 = auth.loading.subscribe(v => loading = v);
    return () => { unsub1(); unsub2(); };
  });

  function handleSubmit(e: Event) {
    e.preventDefault();
    auth.login(email, password).then(ok => {
      if (ok) goto("/dashboard");
    });
  }
</script>

<form onsubmit={handleSubmit}>
  <h1>Entrar</h1>

  {#if error}
    <p class="error">{error}</p>
  {/if}

  <input bind:value={email} type="email" placeholder="Email" required />
  <input bind:value={password} type="password" placeholder="Senha" required minlength="8" />
  <button type="submit" disabled={loading}>
    {loading ? "Entrando..." : "Entrar"}
  </button>
  <a href="/register">Criar conta</a>
</form>
