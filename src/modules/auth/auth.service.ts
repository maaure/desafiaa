import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db, schema } from "../../db";
import { env } from "../../config/env";
import { AppError, UnauthorizedError } from "../../shared/errors";
import type { RegisterInput, LoginInput, UserResponse } from "./auth.schema";
import { eq } from "drizzle-orm";

const BCRYPT_ROUNDS = 12;
const ACCESS_TTL = "15min";
const REFRESH_TTL = "7d";

function signAccess(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: ACCESS_TTL });
}

function signRefresh(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TTL,
  });
}

function toUserResponse(user: typeof schema.users.$inferSelect): UserResponse {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  };
}

export const authService = {
  async register(input: RegisterInput) {
    const existing = await db.query.users.findFirst({
      where: eq(schema.users.email, input.email),
    });
    if (existing)
      throw new AppError("Email já cadastrado", 409, "EMAIL_EXISTS");

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const [user] = await db
      .insert(schema.users)
      .values({ name: input.name, email: input.email, passwordHash })
      .returning();

    const accessToken = signAccess(user.id);
    const refreshToken = signRefresh(user.id);

    return { user: toUserResponse(user), accessToken, refreshToken };
  },

  async login(input: LoginInput) {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, input.email),
    });
    if (!user) throw new UnauthorizedError("Email ou senha inválidos");

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) throw new UnauthorizedError("Email ou senha inválidos");

    const accessToken = signAccess(user.id);
    const refreshToken = signRefresh(user.id);

    return { user: toUserResponse(user), accessToken, refreshToken };
  },

  async refresh(refreshToken: string) {
    try {
      const payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as {
        sub: string;
      };
      const user = await db.query.users.findFirst({
        where: eq(schema.users.id, payload.sub),
      });
      if (!user) throw new UnauthorizedError();

      const accessToken = signAccess(user.id);
      const newRefreshToken = signRefresh(user.id);
      return { accessToken, refreshToken: newRefreshToken };
    } catch {
      throw new UnauthorizedError("Token inválido ou expirado");
    }
  },

  async me(userId: string) {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });
    if (!user) throw new UnauthorizedError();
    return toUserResponse(user);
  },
};
