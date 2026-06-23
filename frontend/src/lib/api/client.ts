import axios, { type AxiosRequestConfig } from "axios";

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

// Response interceptor — unwrap .data, normalize errors
instance.interceptors.response.use(
  (response) => {
    if (response.status === 204) return undefined;
    return response.data;
  },
  (error) => {
    if (axios.isAxiosError(error) && error.response) {
      const body = error.response.data ?? {};
      throw new ApiError(
        error.response.status,
        body.error ?? "UNKNOWN",
        body.message ?? "Erro desconhecido",
      );
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
(instance as unknown as UnwrappedApi).upload = async <T>(url: string, formData: FormData): Promise<T> => {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  const response = await instance.post<T>(url, formData, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": undefined as unknown as string, // deixa o browser definir o boundary
    },
  });
  return response.data as T;
};

export const api = instance as unknown as UnwrappedApi;
