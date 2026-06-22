import { writable, derived } from "svelte/store";
import { authRequests } from "$lib/api/auth/auth.requests";
import { ApiError } from "$lib/api/client";
import { getAccessToken, setAccessToken, removeAccessToken } from "$lib/api/auth/auth.utils";
import type { UserResponse } from "$lib/api/auth/auth.types";

function createAuthStore() {
  const user = writable<UserResponse | null>(null);
  const loading = writable(false);
  const error = writable<string | null>(null);
  const isAuthenticated = derived(user, ($u) => $u !== null);

  async function login(email: string, password: string): Promise<boolean> {
    error.set(null);
    loading.set(true);
    try {
      const result = await authRequests.login({ email, password });
      setAccessToken(result.accessToken);
      user.set(result.user);
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        error.set(err.code === "UNAUTHORIZED" ? "Email ou senha inválidos" : err.message);
      }
      return false;
    } finally {
      loading.set(false);
    }
  }

  async function register(name: string, email: string, password: string): Promise<boolean> {
    error.set(null);
    loading.set(true);
    try {
      const result = await authRequests.register({ name, email, password });
      setAccessToken(result.accessToken);
      user.set(result.user);
      return true;
    } catch (err) {
      error.set(err instanceof ApiError ? err.message : "Erro ao registrar");
      return false;
    } finally {
      loading.set(false);
    }
  }

  async function logout() {
    await authRequests.logout().catch(() => {});
    removeAccessToken();
    user.set(null);
  }

  async function tryRefresh(): Promise<boolean> {
    try {
      const { accessToken } = await authRequests.refresh();
      setAccessToken(accessToken);
      const { user: freshUser } = await authRequests.me();
      user.set(freshUser);
      return true;
    } catch {
      user.set(null);
      return false;
    }
  }

  return {
    subscribe: user.subscribe,
    isAuthenticated,
    loading: { subscribe: loading.subscribe },
    error: { subscribe: error.subscribe },
    login,
    register,
    logout,
    tryRefresh,
  };
}

export const auth = createAuthStore();
