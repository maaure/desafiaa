import { api } from "./client";
import type { UserResponse } from "../types/user";

export const authApi = {
  register: (body: { name: string; email: string; password: string }) =>
    api.fetch<{ user: UserResponse; accessToken: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  login: (body: { email: string; password: string }) =>
    api.fetch<{ user: UserResponse; accessToken: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  refresh: () =>
    api.fetch<{ accessToken: string }>("/api/auth/refresh", { method: "POST" }),

  logout: () => api.fetch<void>("/api/auth/logout", { method: "POST" }),
};
