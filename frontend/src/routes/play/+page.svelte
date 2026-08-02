<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { playerSession } from "$lib/stores/player-session.store";

  let pin = $state("");
  let nickname = $state("");
  let pinError = $state("");
  let nickError = $state("");
  let didSubmit = $state(false);

  function handleSubmit(e: Event) {
    e.preventDefault();
    pinError = "";
    nickError = "";

    if (pin.length !== 6) {
      pinError = "PIN deve ter 6 dígitos";
      return;
    }
    if (nickname.trim().length < 2) {
      nickError = "Mínimo 2 caracteres";
      return;
    }
    if (nickname.trim().length > 20) {
      nickError = "Máximo 20 caracteres";
      return;
    }

    didSubmit = true;
    playerSession.join(pin, nickname.trim());
  }

  $effect(() => {
    if (!didSubmit) return;
    const p = $playerSession;
    if (p.phase === "lobby" && p.pin) {
      goto(resolve(`/play/${p.pin}`));
    }
  });
</script>

<div class="min-h-screen flex">
  <div
    class="hidden lg:flex lg:w-1/2 bg-surface-raised border-r-2 border-ink
    items-center justify-center p-12 relative overflow-hidden"
  >
    <div class="absolute inset-0 opacity-40 paper-dots"></div>
    <div
      class="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-coral-200/60 blur-3xl animate-blob"
    ></div>
    <div
      class="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-ocean-200/60 blur-3xl animate-blob"
      style="animation-delay: -7s"
    ></div>
    <div class="relative text-center">
      <h1 class="font-display text-5xl font-extrabold text-ink tracking-tight mb-4">
        Desafia<span class="text-primary">.</span>
      </h1>
      <p class="text-xl text-ink-soft max-w-sm leading-relaxed">
        Participe de quizzes ao vivo.<br />Responda rápido, suba no ranking.
      </p>
    </div>
  </div>

  <!-- Right form panel -->
  <div
    class="flex-1 flex items-center justify-center p-6 sm:p-12 bg-surface relative overflow-hidden"
  >
    <!-- Orbes tropicais (mobile e desktop) -->
    <div
      class="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-ocean-200/40 blur-3xl animate-blob"
    ></div>
    <div
      class="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-coral-200/40 blur-3xl animate-blob"
      style="animation-delay: -5s"
    ></div>

    <div class="w-full max-w-sm relative">
      <!-- Mobile logo -->
      <div class="lg:hidden text-center mb-8">
        <h1 class="font-display text-3xl font-extrabold text-ink tracking-tight">
          Desafia<span class="text-primary">.</span>
        </h1>
        <p class="text-sm text-ink-faint mt-1">Entre na partida</p>
      </div>

      <form onsubmit={handleSubmit} class="space-y-5">
        <div>
          <label for="pin" class="block text-sm font-semibold text-ink-soft mb-1.5">
            PIN da partida
          </label>
          <input
            id="pin"
            type="text"
            bind:value={pin}
            maxlength={6}
            placeholder="000000"
            disabled={$playerSession.isSubmitting}
            required
            class="w-full px-4 py-3 rounded-xl border-2 bg-surface-raised text-center font-display text-3xl font-extrabold tracking-[0.3em]
              placeholder:tracking-normal placeholder:text-lg placeholder:font-normal placeholder:text-ink-faint
              {pinError
              ? 'border-tomato-500 focus:border-tomato-600'
              : 'border-ink focus:border-ocean-500'}
              outline-none transition-colors disabled:opacity-50 shadow-soft"
          />
          {#if pinError}
            <p class="mt-1.5 text-xs text-danger font-medium">{pinError}</p>
          {/if}
        </div>

        <div>
          <label for="nickname" class="block text-sm font-semibold text-ink-soft mb-1.5">
            Seu apelido
          </label>
          <input
            id="nickname"
            type="text"
            bind:value={nickname}
            maxlength={20}
            placeholder="Como quer ser chamado"
            disabled={$playerSession.isSubmitting}
            required
            class="w-full px-4 py-3.5 rounded-xl border-2 bg-surface-raised text-lg
              placeholder:text-ink-faint shadow-soft
              {nickError
              ? 'border-tomato-500 focus:border-tomato-600'
              : 'border-ink focus:border-ocean-500'}
              outline-none transition-colors disabled:opacity-50"
          />
          {#if nickError}
            <p class="mt-1.5 text-xs text-danger font-medium">{nickError}</p>
          {/if}
        </div>

        <button
          type="submit"
          disabled={pin.length !== 6 || nickname.trim().length < 2 || $playerSession.isSubmitting}
          class="w-full py-4 rounded-xl border-2 border-ink bg-primary text-white text-lg font-bold
            shadow-lift hover:bg-primary-hover active:bg-coral-800 active:translate-y-[3px] active:shadow-none
            disabled:opacity-40 disabled:cursor-not-allowed disabled:active:translate-y-0 disabled:active:shadow-lift
            transition-all"
        >
          {$playerSession.isSubmitting ? "Entrando..." : "Entrar na partida"}
        </button>
      </form>

      {#if $playerSession.error}
        <div
          class="mt-4 rounded-lg border border-tomato-200 bg-tomato-50 px-4 py-3 text-sm font-medium text-tomato-700 animate-fade-in"
        >
          {$playerSession.error}
        </div>
      {/if}

      <p class="mt-8 text-xs text-center text-ink-faint">
        É um host? <a
          href={resolve("/login")}
          class="text-secondary hover:text-ocean-700 font-medium">Acesse o painel</a
        >
      </p>
    </div>
  </div>
</div>
