import { createQuery, createMutation, useQueryClient } from "@tanstack/svelte-query";
import { authApi } from "$lib/api/auth";
import type { UserResponse } from "$lib/types/user";

// ── Queries ──────────────────────────────────────────────────────────

export function useMe() {
  return createQuery(() => ({
    queryKey: ["auth", "me"],
    queryFn: () => authApi.me(),
    staleTime: 5 * 60_000, // 5 min — user data muda pouco
  }));
}

// ── Mutations ────────────────────────────────────────────────────────

export function useLogin() {
  const qc = useQueryClient();

  return createMutation(() => ({
    mutationFn: (body: { email: string; password: string }) => authApi.login(body),
    onSuccess: (data) => {
      qc.setQueryData(["auth", "me"], { user: data.user } satisfies {
        user: UserResponse;
      });
    },
  }));
}

export function useRegister() {
  const qc = useQueryClient();

  return createMutation(() => ({
    mutationFn: (body: { name: string; email: string; password: string }) => authApi.register(body),
    onSuccess: (data) => {
      qc.setQueryData(["auth", "me"], { user: data.user } satisfies {
        user: UserResponse;
      });
    },
  }));
}

export function useLogout() {
  const qc = useQueryClient();

  return createMutation(() => ({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      qc.removeQueries({ queryKey: ["auth"] });
    },
  }));
}
