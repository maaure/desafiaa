import { z } from "zod";

export const createQuizSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
});

export const updateQuizSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  isPublished: z.boolean().optional(),
});

export const quizListItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  isPublished: z.boolean(),
  questionCount: z.number().int(),
  createdAt: z.string(),
});

export const quizFullSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  isPublished: z.boolean(),
  createdAt: z.string(),
  questions: z.array(z.object({
    id: z.string().uuid(),
    text: z.string(),
    imageUrl: z.string().nullable().optional(),
    questionType: z.enum(["multiple_choice", "true_false"]),
    basePoints: z.number().int(),
    sortOrder: z.number().int(),
    alternatives: z.array(z.object({
      id: z.string().uuid(),
      text: z.string(),
      imageUrl: z.string().nullable().optional(),
      isCorrect: z.boolean(),
      sortOrder: z.number().int(),
    })),
  })),
});

export type CreateQuizInput = z.infer<typeof createQuizSchema>;
export type UpdateQuizInput = z.infer<typeof updateQuizSchema>;
