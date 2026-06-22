import { FastifyErrorHandler } from "fastify";
import { ZodError } from "zod";
import { AppError } from "../shared/errors";

export const errorHandler: FastifyErrorHandler = (error, request, reply) => {
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
  request.log.error(error);
  return reply.status(500).send({
    error: "INTERNAL_ERROR",
    message: "Erro interno do servidor",
  });
};
