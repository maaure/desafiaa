import { FastifyInstance } from "fastify";
import { reportService } from "./report.service";
import { authenticate } from "../../middleware/auth";

export async function reportRoutes(app: FastifyInstance) {
  app.addHook("onRequest", authenticate);

  app.get<{ Params: { id: string } }>("/api/quizzes/:id/report", async (request) => {
    return reportService.quizReport(request.params.id, (request as any).userId);
  });

  app.get<{ Params: { id: string } }>("/api/quizzes/:id/sessions", async (request) => {
    return reportService.quizSessions(request.params.id, (request as any).userId);
  });

  app.get<{ Params: { id: string } }>("/api/sessions/:id/report", async (request) => {
    return reportService.sessionReport(request.params.id, (request as any).userId);
  });
}
