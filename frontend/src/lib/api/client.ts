import axios, { type AxiosRequestConfig } from "axios";
import { setAccessToken } from "$lib/api/auth/auth.utils";

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ── Instance with .data unwrapping ───────────────────────────────────

const instance = axios.create({
  withCredentials: true,
});

// Request interceptor — attach auth token from localStorage
instance.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }

  return config;
});

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const { accessToken } = await api.post<{ accessToken: string }>("/api/auth/refresh");
  setAccessToken(accessToken);
  return accessToken;
}

// Response interceptor — unwrap .data, normalize errors
instance.interceptors.response.use(
  (response) => {
    if (response.status === 204) return undefined;
    return response.data;
  },
  async (error) => {
    if (axios.isAxiosError(error) && error.response) {
      const body = error.response.data ?? {};
      const status = error.response.status;
      const config = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined;

      const canRefresh =
        status === 401 && !config?._retried && !config?.url?.includes("/api/auth/");
      if (canRefresh) {
        refreshPromise ??= refreshAccessToken().finally(() => (refreshPromise = null));
        try {
          await refreshPromise;
          config!._retried = true;
          return instance(config!);
        } catch {
          // refresh falhou → cai no erro original (401)
        }
      }

      throw new ApiError(status, body.error ?? "UNKNOWN", body.message ?? "Erro desconhecido");
    }
    throw new ApiError(0, "NETWORK_ERROR", "Erro de rede ou servidor indisponível");
  },
);

// ── Typed wrapper — porque o interceptor acima desempacota .data ─────

interface UnwrappedApi {
  get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>;
  delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>;
  post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  upload<T = unknown>(url: string, formData: FormData): Promise<T>;
  interceptors: typeof instance.interceptors;
}

// Adiciona o método upload
(instance as unknown as UnwrappedApi).upload = async <T>(
  url: string,
  formData: FormData,
): Promise<T> => {
  return instance.post<T>(url, formData, {
    headers: {
      "Content-Type": undefined as unknown as string, // deixa o browser definir o boundary
    },
  }) as Promise<T>;
};

export const api = instance as unknown as UnwrappedApi;
