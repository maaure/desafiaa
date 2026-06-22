import { FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "UNAUTHORIZED", message: "Não autenticado" });
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string };
    (request as any).userId = payload.sub;
  } catch {
    return reply.status(401).send({ error: "UNAUTHORIZED", message: "Token inválido" });
  }
}
