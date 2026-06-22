export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export const api = {
  async fetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem("accessToken");
    const hasBody = !!options.body;

    const res = await fetch(path, {
      ...options,
      headers: {
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      credentials: "include",
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(res.status, body.error ?? "UNKNOWN", body.message ?? "Erro desconhecido");
    }

    if (res.status === 204) return undefined as T;
    return res.json();
  },
};
