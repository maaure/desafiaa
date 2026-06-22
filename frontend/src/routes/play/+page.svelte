<script lang="ts">
  import { goto } from "$app/navigation";
  import { playerSession } from "$lib/stores/player-session.store";

  let pin = $state("");
  let nickname = $state("");
  let joined = $state(false);

  function handleSubmit(e: Event) {
    e.preventDefault();

    const trimmedNick = nickname.trim();
    if (pin.length !== 6 || trimmedNick.length < 2 || trimmedNick.length > 20) {
      return;
    }

    joined = true;
    playerSession.join(pin, trimmedNick);
  }

  // Watch for successful join — navigate to game page
  $effect(() => {
    if (!joined) return;
    const p = $playerSession;
    if (p.phase === "lobby" && p.pin) {
      goto(`/play/${p.pin}`);
    }
  });
</script>

<div class="join-screen">
  <h1>N de Agua</h1>
  <p class="subtitle">Digite o PIN e escolha seu apelido para entrar na partida</p>

  <form onsubmit={handleSubmit} class="join-form">
    <label>
      PIN da partida
      <input
        type="text"
        bind:value={pin}
        maxlength={6}
        placeholder="000000"
        class="pin-input"
        disabled={joined}
        required
      />
    </label>

    <label>
      Seu apelido
      <input
        type="text"
        bind:value={nickname}
        maxlength={20}
        placeholder="Nickname"
        class="nick-input"
        disabled={joined}
        required
      />
    </label>

    <button
      type="submit"
      disabled={pin.length !== 6 || nickname.trim().length < 2 || joined}
    >
      {joined ? "Entrando..." : "Entrar na partida"}
    </button>
  </form>

  {#if $playerSession.error}
    <p class="error-msg">{$playerSession.error}</p>
  {/if}
</div>

<style>
  .join-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 2rem;
    text-align: center;
  }

  h1 {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
  }

  .subtitle {
    color: #666;
    margin-bottom: 2rem;
  }

  .join-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
    max-width: 320px;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.875rem;
    color: #444;
    text-align: left;
  }

  input {
    padding: 0.75rem;
    border: 1px solid #ccc;
    border-radius: 8px;
    font-size: 1.125rem;
    text-align: center;
    transition: border-color 0.2s;
  }

  input:focus {
    outline: none;
    border-color: #4a90d9;
    box-shadow: 0 0 0 2px rgba(74, 144, 217, 0.2);
  }

  .pin-input {
    font-family: monospace;
    letter-spacing: 0.5em;
  }

  button {
    padding: 0.875rem;
    background: #4a90d9;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }

  button:hover:not(:disabled) {
    background: #357abd;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .error-msg {
    margin-top: 1rem;
    padding: 0.75rem 1rem;
    background: #fef2f2;
    color: #dc2626;
    border-radius: 8px;
    font-size: 0.875rem;
  }
</style>
