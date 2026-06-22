import { createQuery } from "@tanstack/svelte-query";
import { sessionRequests } from "./sessions.requests";

export const sessionKeys = {
  all: ["sessions"] as const,
  detail: (id: string) => ["sessions", "detail", id] as const,
  results: (id: string) => ["sessions", "results", id] as const,
  verifyPin: (pin: string) => ["sessions", "join", pin] as const,
};

export function useSession(id: string) {
  return createQuery(() => ({
    queryKey: sessionKeys.detail(id),
    queryFn: () => sessionRequests.getById(id),
    enabled: !!id,
  }));
}

export function useSessionResults(id: string) {
  return createQuery(() => ({
    queryKey: sessionKeys.results(id),
    queryFn: () => sessionRequests.getResults(id),
    enabled: !!id,
  }));
}

export function useVerifyPin(pin: string) {
  return createQuery(() => ({
    queryKey: sessionKeys.verifyPin(pin),
    queryFn: () => sessionRequests.verifyPin(pin),
    enabled: pin.length >= 3,
  }));
}
