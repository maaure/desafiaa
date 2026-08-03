import { z } from "zod";

// Upsert completo: `id` presente = edição, ausente = criação.
// Uma única requisição persiste quiz + perguntas + alternativas.
export const saveQuizSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  isPublished: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  questions: z
    .array(
      z.object({
        // id presente = atualizar; ausente = criar
        id: z.string().uuid().optional(),
        text: z.string().min(1),
        questionType: z.enum(["multiple_choice", "true_false"]),
        basePoints: z.number().int().min(1).default(1000),
        imageUrl: z.string().nullable().optional(),
        alternatives: z.array(
          z.object({
            id: z.string().uuid().optional(),
            text: z.string().min(1),
            isCorrect: z.boolean().default(false),
            imageUrl: z.string().nullable().optional(),
          }),
        ),
      }),
    )
    .default([]),
});

export const updateQuizSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  isPublished: z.boolean().optional(),
  isPublic: z.boolean().optional(),
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
  questions: z.array(
    z.object({
      id: z.string().uuid(),
      text: z.string(),
      imageUrl: z.string().nullable().optional(),
      questionType: z.enum(["multiple_choice", "true_false"]),
      basePoints: z.number().int(),
      sortOrder: z.number().int(),
      alternatives: z.array(
        z.object({
          id: z.string().uuid(),
          text: z.string(),
          imageUrl: z.string().nullable().optional(),
          isCorrect: z.boolean(),
          sortOrder: z.number().int(),
        }),
      ),
    }),
  ),
});

export type SaveQuizInput = z.infer<typeof saveQuizSchema>;
export type UpdateQuizInput = z.infer<typeof updateQuizSchema>;
