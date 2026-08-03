import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { env } from "../../config/env";
import { AppError, UnauthorizedError } from "../../shared/errors";
import { authRepo } from "./auth.repository";
import type {
  RegisterInput,
  LoginInput,
  GoogleLoginInput,
  UserResponse,
  AuthTokens,
} from "./auth.types";

const BCRYPT_ROUNDS = 12;
const ACCESS_TTL = "15min";
const REFRESH_TTL = "7d";

// Verifica ID tokens do Google localmente (JWKs) — sem HTTP externo por request
const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

function signAccess(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: ACCESS_TTL });
}

function signRefresh(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_TTL });
}

function toUserResponse(user: {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt: Date;
}): UserResponse {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
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
    // Conta criada via Google não tem senha — login por email não funciona nela
    if (!user || !user.passwordHash) throw new UnauthorizedError("Email ou senha inválidos");

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) throw new UnauthorizedError("Email ou senha inválidos");

    return {
      user: toUserResponse(user),
      accessToken: signAccess(user.id),
      refreshToken: signRefresh(user.id),
    };
  },

  /**
   * Login social: verifica o ID token do Google e faz login ou cria conta.
   * Vincula google_id a contas email/senha existentes com o mesmo email.
   */
  async googleLogin(input: GoogleLoginInput): Promise<{ user: UserResponse } & AuthTokens> {
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: input.credential,
        audience: env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedError("Credencial do Google inválida ou expirada");
    }

    if (!payload?.sub || !payload.email) {
      throw new AppError(
        "A conta do Google precisa ter um email verificado",
        400,
        "GOOGLE_EMAIL_REQUIRED",
      );
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase();
    const name = payload.name ?? email.split("@")[0];
    const avatarUrl = payload.picture ?? null;

    // 1) Já logou com Google antes → login direto (atualiza dados do perfil)
    const byGoogle = await authRepo.findByGoogleId(googleId);
    if (byGoogle) {
      if (byGoogle.name !== name || byGoogle.avatarUrl !== avatarUrl) {
        await authRepo.linkGoogle(byGoogle.id, { googleId, avatarUrl });
      }
      return {
        user: toUserResponse({ ...byGoogle, name, avatarUrl }),
        accessToken: signAccess(byGoogle.id),
        refreshToken: signRefresh(byGoogle.id),
      };
    }

    // 2) Conta email/senha com o mesmo email → vincula o Google
    const byEmail = await authRepo.findByEmail(email);
    if (byEmail) {
      const linked = await authRepo.linkGoogle(byEmail.id, { googleId, avatarUrl });
      return {
        user: toUserResponse(linked),
        accessToken: signAccess(linked.id),
        refreshToken: signRefresh(linked.id),
      };
    }

    // 3) Nunca viu esse usuário → cria conta nova
    const created = await authRepo.upsertGoogleUser({ googleId, email, name, avatarUrl });
    return {
      user: toUserResponse(created),
      accessToken: signAccess(created.id),
      refreshToken: signRefresh(created.id),
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
