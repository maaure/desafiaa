import { api } from "$lib/api/client";
import type { UserResponse } from "./auth.types";

export const authRequests = {
  register: (body: { name: string; email: string; password: string }) =>
    api.post<{ user: UserResponse; accessToken: string }>("/api/auth/register", body),

  login: (body: { email: string; password: string }) =>
    api.post<{ user: UserResponse; accessToken: string }>("/api/auth/login", body),

  googleLogin: (credential: string) =>
    api.post<{ user: UserResponse; accessToken: string }>("/api/auth/google", { credential }),

  refresh: () => api.post<{ accessToken: string }>("/api/auth/refresh"),

  me: () => api.get<{ user: UserResponse }>("/api/auth/me"),

  logout: () => api.post<void>("/api/auth/logout"),
};
