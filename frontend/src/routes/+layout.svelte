<script lang="ts">
  import { QueryClientProvider } from "@tanstack/svelte-query";
  import { queryClient } from "$lib/query-client";
  import Toaster from "$lib/components/ui/Toaster.svelte";
  import { page } from "$app/stores";
  import "../app.css";

  let { children } = $props();

  const PAGE_TITLES: Array<[RegExp, string | null]> = [
    [/^\/$/, null],
    [/^\/dashboard$/, "Meus Quizzes"],
    [/^\/quiz\/new$/, "Novo Quiz"],
    [/^\/quiz\/[^/]+\/edit$/, "Editar Quiz"],
    [/^\/quiz\/[^/]+\/report$/, "Relatório do Quiz"],
    [/^\/quiz\/[^/]+$/, "Quiz"],
    [/^\/quizzes\/public\/[^/]+$/, "Quiz Público"],
    [/^\/quizzes\/public$/, "Quizzes Públicos"],
    [/^\/sessions$/, "Sessões Ativas"],
    [/^\/session\/[^/]+\/host$/, "Sessão ao Vivo"],
    [/^\/play\/[^/]+$/, "Partida"],
    [/^\/play$/, "Entrar na Partida"],
    [/^\/login$/, "Entrar"],
    [/^\/register$/, "Criar Conta"],
  ];

  let pageTitle = $derived(PAGE_TITLES.find(([re]) => re.test($page.url.pathname))?.[1] ?? null);

  // Preview de link (WhatsApp, Telegram, X...) — título segue a página, exceto na
  // landing, que usa o título de marketing do head dela.
  let ogTitle = $derived(
    pageTitle
      ? `${pageTitle} | Desafia.`
      : "Desafia: sua aula, reunião ou festa viram um game show",
  );
</script>

<svelte:head>
  {#if pageTitle}
    <title>{pageTitle} | Desafia.</title>
  {/if}

  <meta property="og:title" content={ogTitle} />
  <meta
    property="og:description"
    content="Crie quizzes em minutos e desafie sua plateia a jogar ao vivo pelo celular."
  />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Desafia." />
  <meta property="og:url" content={$page.url.href} />
  <meta property="og:image" content={`${$page.url.origin}/og-image.png`} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content={`${$page.url.origin}/og-image.png`} />
</svelte:head>

<QueryClientProvider client={queryClient}>
  {@render children()}
  <Toaster />
</QueryClientProvider>
