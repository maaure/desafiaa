<script lang="ts">
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { auth } from "$lib/stores/auth.store";

  // Tipos mínimos do Google Identity Services (GIS) — window.google é injetado pelo script
  interface GoogleCredentialResponse {
    credential: string;
  }
  interface GisIdApi {
    initialize: (config: {
      client_id: string;
      callback: (response: GoogleCredentialResponse) => void;
    }) => void;
    renderButton: (el: HTMLElement, options: Record<string, unknown>) => void;
  }

  const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
  const gis = () =>
    (window as unknown as { google?: { accounts: { id: GisIdApi } } }).google?.accounts?.id;

  let container = $state<HTMLDivElement | undefined>(undefined);
  let error = $state<string | null>(null);
  let loading = $state(false);

  // Carrega o SDK do Google uma única vez, sob demanda
  function loadGis(): Promise<void> {
    return new Promise((resolvePromise, reject) => {
      if (gis()) return resolvePromise();
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => resolvePromise();
      script.onerror = () => reject(new Error("Não foi possível carregar o login do Google"));
      document.head.appendChild(script);
    });
  }

  async function handleCredential(response: GoogleCredentialResponse) {
    if (!response.credential) return;
    loading = true;
    error = null;
    const ok = await auth.loginWithGoogle(response.credential);
    loading = false;
    if (ok) {
      goto(resolve("/dashboard"));
    } else {
      error = get(auth.error);
    }
  }

  onMount(async () => {
    try {
      await loadGis();
      const api = gis();
      if (!api || !container) return;
      api.initialize({
        client_id: CLIENT_ID,
        callback: handleCredential,
      });
      api.renderButton(container, {
        theme: "outline",
        size: "large",
        text: "signin_with",
        shape: "rectangular",
        width: container.offsetWidth,
      });
    } catch (e) {
      error = e instanceof Error ? e.message : "Erro ao carregar o login do Google";
    }
  });
</script>

{#if error}
  <p class="text-sm text-tomato-600 mb-2 text-center">{error}</p>
{/if}

{#if loading}
  <div
    class="flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-ink bg-surface-raised shadow-soft"
  >
    <div
      class="w-4 h-4 border-2 border-sand-200 border-t-ocean-500 rounded-full animate-spin"
    ></div>
    <span class="text-sm font-semibold text-ink-soft">Entrando com Google...</span>
  </div>
{:else}
  <div bind:this={container} class="w-full [&>iframe]:!w-full [&>div]:!w-full"></div>
{/if}
