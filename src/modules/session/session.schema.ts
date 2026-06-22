import { z } from "zod";

export const createSessionSchema = z.object({
  quizId: z.string().uuid(),
});

export const sessionResponseSchema = z.object({
  id: z.string().uuid(),
  pin: z.string().length(6),
  quizTitle: z.string(),
  status: z.enum(["lobby", "playing", "finished"]),
  timeLimitSeconds: z.number().int(),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
