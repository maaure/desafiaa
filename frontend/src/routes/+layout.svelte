<script lang="ts">
  import { QueryClientProvider } from "@tanstack/svelte-query";
  import { queryClient } from "$lib/query-client";
  import "../app.css";

  let { children } = $props();
</script>

<QueryClientProvider client={queryClient}>
  {@render children()}
</QueryClientProvider>
