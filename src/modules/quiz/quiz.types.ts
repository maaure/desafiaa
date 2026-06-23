// Tipos do módulo quiz — entidades, listas e inputs

// ── Entidades ────────────────────────────────────────────────────

export interface AlternativeEntity {
  id: string;
  text: string;
  imageUrl?: string | null;
  isCorrect: boolean;
  sortOrder: number;
}

export interface QuestionEntity {
  id: string;
  text: string;
  imageUrl?: string | null;
  questionType: "multiple_choice" | "true_false";
  basePoints: number;
  sortOrder: number;
  alternatives?: AlternativeEntity[];
}

export interface QuizEntity {
  id: string;
  title: string;
  description: string | null;
  isPublished: boolean;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuizListItem {
  id: string;
  title: string;
  description: string | null;
  isPublished: boolean;
  questionCount: number;
  createdAt: string;
}

export interface QuizFull {
  id: string;
  title: string;
  description: string | null;
  isPublished: boolean;
  createdAt: string;
  questions: QuestionFull[];
}

export interface QuestionFull {
  id: string;
  text: string;
  imageUrl?: string | null;
  questionType: "multiple_choice" | "true_false";
  basePoints: number;
  sortOrder: number;
  alternatives: AlternativeFull[];
}

export interface AlternativeFull {
  id: string;
  text: string;
  imageUrl?: string | null;
  isCorrect: boolean;
  sortOrder: number;
}

// ── Inputs ───────────────────────────────────────────────────────

export interface CreateQuestionInput {
  text: string;
  imageUrl?: string | null;
  questionType: "multiple_choice" | "true_false";
  basePoints: number;
}

export interface UpdateQuestionInput {
  text?: string;
  imageUrl?: string | null;
  questionType?: "multiple_choice" | "true_false";
  basePoints?: number;
  sortOrder?: number;
}

export interface CreateAlternativeInput {
  text: string;
  imageUrl?: string | null;
  isCorrect: boolean;
}

export interface UpdateAlternativeInput {
  text?: string;
  imageUrl?: string | null;
  isCorrect?: boolean;
}
