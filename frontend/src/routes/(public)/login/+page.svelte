<script lang="ts">
  import { auth } from "$lib/stores/auth.store";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { onMount } from "svelte";
  import { Gamepad2 } from "@lucide/svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import GoogleLoginButton from "$lib/components/ui/GoogleLoginButton.svelte";

  let email = $state("");
  let password = $state("");
  let error = $state<string | null>(null);
  let loading = $state(false);

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
    auth.login(email, password).then((ok) => {
      if (ok) goto(resolve("/dashboard"));
    });
  }
</script>

<div class="min-h-screen flex items-center justify-center p-6 bg-surface relative overflow-hidden">
  <!-- Orbes tropicais de fundo -->
  <div
    class="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-ocean-200/50 blur-3xl animate-blob"
  ></div>
  <div
    class="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-coral-200/50 blur-3xl animate-blob"
    style="animation-delay: -5s"
  ></div>
  <div
    class="absolute top-1/3 right-1/4 w-64 h-64 rounded-full bg-mango-200/40 blur-3xl animate-blob"
    style="animation-delay: -9s"
  ></div>

  <div class="w-full max-w-sm relative">
    <!-- Brand -->
    <div class="text-center mb-8">
      <span
        class="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-secondary border-2 border-ink shadow-lift mb-4 -rotate-2"
      >
        <Gamepad2 class="w-6 h-6 text-white" />
      </span>
      <h1 class="font-display text-3xl font-extrabold text-ink tracking-tight mb-1">
        Desafia<span class="text-primary">.</span>
      </h1>
      <p class="text-sm text-ink-faint">Acesse o painel do host</p>
    </div>

    <!-- Form card -->
    <form
      onsubmit={handleSubmit}
      class="bg-surface-raised rounded-2xl border-2 border-ink p-6 space-y-4 shadow-lift"
    >
      {#if error}
        <div
          class="rounded-lg border border-tomato-200 bg-tomato-50 px-4 py-3 text-sm font-medium text-tomato-700 animate-fade-in"
        >
          {error}
        </div>
      {/if}

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
        placeholder="Sua senha"
        required
        minlength="8"
        oninput={(e) => (password = (e.target as HTMLInputElement).value)}
      />

      <Button type="submit" variant="primary" {loading} class="w-full">
        {loading ? "Entrando..." : "Entrar"}
      </Button>
    </form>

    <!-- Divisor -->
    <div class="flex items-center gap-3 my-5">
      <div class="flex-1 h-px bg-ink/20"></div>
      <span class="text-xs font-semibold uppercase tracking-widest text-ink-faint">ou</span>
      <div class="flex-1 h-px bg-ink/20"></div>
    </div>

    <!-- Login social -->
    <GoogleLoginButton />

    <p class="mt-6 text-center text-sm text-ink-faint">
      Não tem conta? <a
        href={resolve("/register")}
        class="text-secondary hover:text-ocean-700 font-medium">Criar conta</a
      >
    </p>

    <p class="mt-3 text-center text-xs text-ink-faint">
      <a href={resolve("/play")} class="hover:text-ink-soft transition-colors">Sou um jogador</a>
    </p>
  </div>
</div>
