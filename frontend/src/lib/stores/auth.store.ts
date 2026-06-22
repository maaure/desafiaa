import { writable, derived } from "svelte/store";
import { authApi } from "$lib/api/auth";
import { ApiError } from "$lib/api/client";
import type { UserResponse } from "$lib/types/user";

function createAuthStore() {
  const user = writable<UserResponse | null>(null);
  const loading = writable(false);
  const error = writable<string | null>(null);
  const isAuthenticated = derived(user, ($u) => $u !== null);

  async function login(email: string, password: string): Promise<boolean> {
    error.set(null);
    loading.set(true);
    try {
      const result = await authApi.login({ email, password });
      localStorage.setItem("accessToken", result.accessToken);
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
      const result = await authApi.register({ name, email, password });
      localStorage.setItem("accessToken", result.accessToken);
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
    await authApi.logout().catch(() => {});
    localStorage.removeItem("accessToken");
    user.set(null);
  }

  async function tryRefresh(): Promise<boolean> {
    try {
      const { accessToken } = await authApi.refresh();
      localStorage.setItem("accessToken", accessToken);
      const { user: freshUser } = await authApi.me();
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
