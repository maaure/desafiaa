import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const googleLoginSchema = z.object({
  // ID token emitido pelo Google Identity Services (GIS)
  credential: z.string().min(1),
});

export const userResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  avatarUrl: z.string().nullable(),
  createdAt: z.string(),
});

export const authResponseSchema = z.object({
  user: userResponseSchema,
  accessToken: z.string(),
});

// Tipos re-exportados de auth.types.ts
export type {
  RegisterInput,
  LoginInput,
  GoogleLoginInput,
  UserResponse,
  AuthTokens,
} from "./auth.types";
