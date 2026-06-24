<script lang="ts">
  import { auth } from "$lib/stores/auth.store";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { onMount } from "svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Input from "$lib/components/ui/Input.svelte";

  let name = $state("");
  let email = $state("");
  let password = $state("");
  let confirm = $state("");
  let error = $state<string | null>(null);
  let loading = $state(false);
  let localError = $state<string | null>(null);

  onMount(() => {
    const unsub1 = auth.error.subscribe((v) => (error = v));
    const unsub2 = auth.loading.subscribe((v) => (loading = v));
    return () => {
      unsub1();
      unsub2();
    };
  });

  function handleSubmit(e: Event) {
    e.preventDefault();
    localError = null;
    if (password !== confirm) {
      localError = "As senhas não conferem";
      return;
    }
    auth.register(name, email, password).then((ok) => {
      if (ok) goto(resolve("/dashboard"));
    });
  }
</script>

<div class="min-h-screen flex items-center justify-center p-6 bg-slate-50">
  <div class="w-full max-w-sm">
    <div class="text-center mb-8">
      <h1 class="text-2xl font-bold text-slate-900 mb-1">Desafia</h1>
      <p class="text-sm text-slate-400">Crie sua conta de host</p>
    </div>

    <form
      onsubmit={handleSubmit}
      class="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm"
    >
      {#if error || localError}
        <div
          class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 animate-fade-in"
        >
          {error || localError}
        </div>
      {/if}

      <Input
        label="Nome"
        type="text"
        value={name}
        placeholder="Seu nome"
        required
        minlength="2"
        oninput={(e) => (name = (e.target as HTMLInputElement).value)}
      />

      <Input
        label="Email"
        type="email"
        value={email}
        placeholder="seu@email.com"
        required
        oninput={(e) => (email = (e.target as HTMLInputElement).value)}
      />

      <Input
        label="Senha"
        type="password"
        value={password}
        placeholder="Mínimo 8 caracteres"
        required
        minlength="8"
        oninput={(e) => (password = (e.target as HTMLInputElement).value)}
      />

      <Input
        label="Confirmar senha"
        type="password"
        value={confirm}
        placeholder="Repita a senha"
        required
        minlength="8"
        oninput={(e) => (confirm = (e.target as HTMLInputElement).value)}
      />

      <Button type="submit" variant="primary" {loading}>
        {loading ? "Criando conta..." : "Criar conta"}
      </Button>
    </form>

    <p class="mt-6 text-center text-sm text-slate-400">
      Já tem conta? <a
        href={resolve("/login")}
        class="text-violet-600 hover:text-violet-700 font-medium">Entrar</a
      >
    </p>
  </div>
</div>
