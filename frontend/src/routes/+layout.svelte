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
</script>

<svelte:head>
  {#if pageTitle}
    <title>{pageTitle} | Desafia.</title>
  {/if}
</svelte:head>

<QueryClientProvider client={queryClient}>
  {@render children()}
  <Toaster />
</QueryClientProvider>
