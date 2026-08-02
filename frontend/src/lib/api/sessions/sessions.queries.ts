import { createQuery } from "@tanstack/svelte-query";
import { sessionRequests } from "./sessions.requests";

export const sessionKeys = {
  all: ["sessions"] as const,
  active: ["sessions", "active"] as const,
};

export function useActiveSessions() {
  return createQuery(() => ({
    queryKey: sessionKeys.active,
    queryFn: () => sessionRequests.listActive(),
    staleTime: 30_000,
    // Sessões mudam via socket (fora do TanStack) — sempre refetch ao montar a aba
    refetchOnMount: "always",
  }));
}
