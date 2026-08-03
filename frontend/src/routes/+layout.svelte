<script lang="ts">
  import { QueryClientProvider } from "@tanstack/svelte-query";
  import { queryClient } from "$lib/query-client";
  import Toaster from "$lib/components/ui/Toaster.svelte";
  import "../app.css";

  let { children } = $props();
</script>

<QueryClientProvider client={queryClient}>
  {@render children()}
  <Toaster />
</QueryClientProvider>
