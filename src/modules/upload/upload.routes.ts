import { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/auth";
import { uploadService } from "./upload.service";

export async function uploadRoutes(app: FastifyInstance) {
  app.post("/api/upload", { onRequest: authenticate }, async (request, reply) => {
    const file = await request.file();

    if (!file) {
      return reply.status(400).send({
        code: "NO_FILE",
        message: "Nenhum arquivo enviado.",
      });
    }

    const result = await uploadService.upload(file);
    return reply.status(201).send(result);
  });
}
