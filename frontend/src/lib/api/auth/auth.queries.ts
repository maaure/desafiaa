import { createQuery } from "@tanstack/svelte-query";
import { authRequests } from "./auth.requests";

export function useMe() {
  return createQuery(() => ({
    queryKey: ["auth", "me"],
    queryFn: () => authRequests.me(),
    staleTime: 5 * 60_000, // 5 min — user data muda pouco
  }));
}
