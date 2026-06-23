import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { AppError, UnauthorizedError } from "../../shared/errors";
import { authRepo } from "./auth.repository";
import type { RegisterInput, LoginInput, UserResponse, AuthTokens } from "./auth.types";

const BCRYPT_ROUNDS = 12;
const ACCESS_TTL = "15min";
const REFRESH_TTL = "7d";

function signAccess(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: ACCESS_TTL });
}

function signRefresh(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_TTL });
}

function toUserResponse(user: { id: string; name: string; email: string; createdAt: Date }): UserResponse {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  };
}

export const authService = {
  async register(input: RegisterInput): Promise<{ user: UserResponse } & AuthTokens> {
    const existing = await authRepo.findByEmail(input.email);
    if (existing) {
      throw new AppError("Email já cadastrado", 409, "EMAIL_EXISTS");
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const user = await authRepo.insertUser({
      name: input.name,
      email: input.email,
      passwordHash,
    });

    return {
      user: toUserResponse(user),
      accessToken: signAccess(user.id),
      refreshToken: signRefresh(user.id),
    };
  },

  async login(input: LoginInput): Promise<{ user: UserResponse } & AuthTokens> {
    const user = await authRepo.findByEmail(input.email);
    if (!user) throw new UnauthorizedError("Email ou senha inválidos");

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) throw new UnauthorizedError("Email ou senha inválidos");

    return {
      user: toUserResponse(user),
      accessToken: signAccess(user.id),
      refreshToken: signRefresh(user.id),
    };
  },

  async refresh(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { sub: string };
      const user = await authRepo.findById(payload.sub);
      if (!user) throw new UnauthorizedError();

      return {
        accessToken: signAccess(user.id),
        refreshToken: signRefresh(user.id),
      };
    } catch {
      throw new UnauthorizedError("Token inválido ou expirado");
    }
  },

  async me(userId: string): Promise<UserResponse> {
    const user = await authRepo.findById(userId);
    if (!user) throw new UnauthorizedError();
    return toUserResponse(user);
  },
};
