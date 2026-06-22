import { createMutation, useQueryClient } from "@tanstack/svelte-query";
import { authRequests } from "./auth.requests";
import type { UserResponse } from "./auth.types";

export function useLogin() {
  const qc = useQueryClient();

  return createMutation(() => ({
    mutationFn: (body: { email: string; password: string }) => authRequests.login(body),
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
    mutationFn: (body: { name: string; email: string; password: string }) =>
      authRequests.register(body),
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
    mutationFn: () => authRequests.logout(),
    onSettled: () => {
      qc.removeQueries({ queryKey: ["auth"] });
    },
  }));
}
