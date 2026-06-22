<script lang="ts">
  import { auth } from "$lib/stores/auth.store";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";

  let name = $state("");
  let email = $state("");
  let password = $state("");
  let confirm = $state("");
  let error = $state<string | null>(null);
  let loading = $state(false);

  onMount(() => {
    const unsub1 = auth.error.subscribe(v => error = v);
    const unsub2 = auth.loading.subscribe(v => loading = v);
    return () => { unsub1(); unsub2(); };
  });

  function handleSubmit(e: Event) {
    e.preventDefault();
    if (password !== confirm) return;
    auth.register(name, email, password).then(ok => {
      if (ok) goto("/dashboard");
    });
  }
</script>

<form onsubmit={handleSubmit}>
  <h1>Criar Conta</h1>

  {#if error}
    <p class="error">{error}</p>
  {/if}

  <input bind:value={name} placeholder="Nome" required minlength="2" />
  <input bind:value={email} type="email" placeholder="Email" required />
  <input bind:value={password} type="password" placeholder="Senha" required minlength="8" />
  <input bind:value={confirm} type="password" placeholder="Confirmar senha" required minlength="8" />
  <button type="submit" disabled={loading}>
    {loading ? "Criando..." : "Criar conta"}
  </button>
  <a href="/login">Já tenho conta</a>
</form>
