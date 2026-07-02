import { FastifyInstance } from "fastify";
import { authService } from "./auth.service";
import { registerSchema, loginSchema, userResponseSchema, authResponseSchema } from "./auth.schema";
import { authenticate } from "../../middleware/auth";
import { zSchema } from "../../lib/swagger";

export async function authRoutes(app: FastifyInstance) {
  app.post(
    "/api/auth/register",
    {
      schema: {
        tags: ["auth"],
        body: zSchema(registerSchema),
        response: { 201: zSchema(authResponseSchema) },
      },
    },
    async (request, reply) => {
      const input = request.body as any;
      const { user, accessToken, refreshToken } =
        await authService.register(input);

      reply.setCookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/api/auth",
        maxAge: 7 * 24 * 3600,
      });

      return reply.status(201).send({ user, accessToken });
    },
  );

  app.post(
    "/api/auth/login",
    {
      schema: {
        tags: ["auth"],
        body: zSchema(loginSchema),
      },
    },
    async (request, reply) => {
      const input = request.body as any;
      const { user, accessToken, refreshToken } =
        await authService.login(input);

      reply.setCookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/api/auth",
        maxAge: 7 * 24 * 3600,
      });

      return reply.send({ user, accessToken });
    },
  );

  app.post(
    "/api/auth/refresh",
    {
      schema: { tags: ["auth"] },
    },
    async (request, reply) => {
      const token = request.cookies.refreshToken;
      if (!token)
        return reply
          .status(401)
          .send({ error: "UNAUTHORIZED", message: "Sem refresh token" });

      const { accessToken, refreshToken } = await authService.refresh(token);

      reply.setCookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/api/auth",
        maxAge: 7 * 24 * 3600,
      });

      return reply.send({ accessToken });
    },
  );

  app.get(
    "/api/auth/me",
    {
      schema: { tags: ["auth"] },
      onRequest: authenticate,
    },
    async (request, reply) => {
      const userId = (request as any).userId as string;
      const user = await authService.me(userId);
      return reply.send({ user });
    },
  );

  app.post(
    "/api/auth/logout",
    {
      schema: { tags: ["auth"] },
    },
    async (_request, reply) => {
      reply.clearCookie("refreshToken", { path: "/api/auth" });
      return reply.status(204).send();
    },
  );
}
