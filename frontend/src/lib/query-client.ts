import { QueryClient } from "@tanstack/svelte-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30s antes de considerar stale
      retry: 1, // 1 retry em caso de erro
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
