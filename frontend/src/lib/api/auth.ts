import { api } from "./client";
import type { UserResponse } from "../types/user";

export const authApi = {
  register: (body: { name: string; email: string; password: string }) =>
    api.post<{ user: UserResponse; accessToken: string }>("/api/auth/register", body),

  login: (body: { email: string; password: string }) =>
    api.post<{ user: UserResponse; accessToken: string }>("/api/auth/login", body),

  refresh: () =>
    api.post<{ accessToken: string }>("/api/auth/refresh"),

  me: () =>
    api.get<{ user: UserResponse }>("/api/auth/me"),

  logout: () =>
    api.post<void>("/api/auth/logout"),
};
