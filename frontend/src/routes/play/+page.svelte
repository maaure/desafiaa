<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { playerSession } from "$lib/stores/player-session.store";

  let pin = $state("");
  let nickname = $state("");
  let joined = $state(false);
  let pinError = $state("");
  let nickError = $state("");

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

    joined = true;
    playerSession.join(pin, nickname.trim());
  }

  $effect(() => {
    if (!joined) return;
    const p = $playerSession;
    if (p.phase === "lobby" && p.pin) {
      goto(resolve(`/play/${p.pin}`));
    }
  });
</script>

<div class="min-h-screen flex">
  <div
    class="hidden lg:flex lg:w-1/2 bg-linear-to-br from-slate-900 via-violet-950 to-slate-900
    items-center justify-center p-12 relative overflow-hidden"
  >
    <div
      class="absolute inset-0 opacity-[0.03]"
      style="background-image: radial-gradient(circle at 25% 30%, #8b5cf6 1px, transparent 1px), radial-gradient(circle at 75% 70%, #8b5cf6 1px, transparent 1px); background-size: 60px 60px;"
    ></div>
    <div class="relative text-center">
      <div class="text-8xl mb-6">🌊</div>
      <h1 class="text-4xl font-bold text-white tracking-tight mb-4">Desafia</h1>
      <p class="text-lg text-violet-200/70 max-w-sm leading-relaxed">
        Participe de quizzes ao vivo.<br />Responda rápido, suba no ranking.
      </p>
    </div>
  </div>

  <!-- Right form panel -->
  <div class="flex-1 flex items-center justify-center p-6 sm:p-12">
    <div class="w-full max-w-sm">
      <!-- Mobile logo -->
      <div class="lg:hidden text-center mb-8">
        <h1 class="text-3xl font-bold text-slate-900">Desafia</h1>
        <p class="text-sm text-slate-400 mt-1">Entre na partida</p>
      </div>

      <form onsubmit={handleSubmit} class="space-y-5">
        <div>
          <label for="pin" class="block text-sm font-semibold text-slate-700 mb-1.5">
            PIN da partida
          </label>
          <input
            id="pin"
            type="text"
            bind:value={pin}
            maxlength={6}
            placeholder="000000"
            disabled={joined}
            required
            class="w-full px-4 py-3 rounded-xl border text-center text-2xl font-mono font-bold tracking-[0.3em]
              placeholder:tracking-normal placeholder:text-lg placeholder:font-normal placeholder:text-slate-300
              {pinError
              ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
              : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100'}
              focus:ring-2 outline-none transition-colors disabled:opacity-50"
          />
          {#if pinError}
            <p class="mt-1.5 text-xs text-red-500 font-medium">{pinError}</p>
          {/if}
        </div>

        <div>
          <label for="nickname" class="block text-sm font-semibold text-slate-700 mb-1.5">
            Seu apelido
          </label>
          <input
            id="nickname"
            type="text"
            bind:value={nickname}
            maxlength={20}
            placeholder="Como quer ser chamado"
            disabled={joined}
            required
            class="w-full px-4 py-3 rounded-xl border border-slate-200 text-base
              placeholder:text-slate-300
              {nickError
              ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
              : 'focus:border-violet-400 focus:ring-violet-100'}
              focus:ring-2 outline-none transition-colors disabled:opacity-50"
          />
          {#if nickError}
            <p class="mt-1.5 text-xs text-red-500 font-medium">{nickError}</p>
          {/if}
        </div>

        <button
          type="submit"
          disabled={pin.length !== 6 || nickname.trim().length < 2 || joined}
          class="w-full py-3 rounded-xl bg-violet-600 text-white text-base font-bold
            hover:bg-violet-700 active:bg-violet-800 disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors shadow-sm"
        >
          {joined ? "Entrando..." : "Entrar na partida"}
        </button>
      </form>

      {#if $playerSession.error}
        <div
          class="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 animate-fade-in"
        >
          {$playerSession.error}
        </div>
      {/if}

      <p class="mt-8 text-xs text-center text-slate-400">
        É um host? <a
          href={resolve("/login")}
          class="text-violet-600 hover:text-violet-700 font-medium">Acesse o painel</a
        >
      </p>
    </div>
  </div>
</div>
