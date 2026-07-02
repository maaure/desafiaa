import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { AppError } from "../shared/errors";

export const errorHandler = (
  error: unknown,
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: error.code,
      message: error.message,
    });
  }
  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: "VALIDATION_ERROR",
      message: "Dados inválidos",
      details: error.flatten().fieldErrors,
    });
  }
  // Fastify built-in errors (e.g. empty JSON body) carry their own statusCode
  const fastifyErr = error as { statusCode?: number; code?: string; message?: string };
  if (fastifyErr.statusCode && fastifyErr.statusCode < 500) {
    return reply.status(fastifyErr.statusCode).send({
      error: fastifyErr.code ?? "BAD_REQUEST",
      message: fastifyErr.message ?? "Erro de validação",
    });
  }
  request.log.error(error);
  return reply.status(500).send({
    error: "INTERNAL_ERROR",
    message: "Erro interno do servidor",
  });
};
