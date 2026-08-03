// Derived from backend src/db/schema.ts and src/modules/quiz/quiz.schema.ts

export interface Alternative {
  id: string;
  text: string;
  imageUrl?: string | null;
  isCorrect: boolean;
  sortOrder: number;
}

export interface Question {
  id: string;
  text: string;
  imageUrl?: string | null;
  questionType: "multiple_choice" | "true_false";
  basePoints: number;
  sortOrder: number;
  alternatives: Alternative[];
}

export interface Quiz {
  id: string;
  title: string;
  description: string | null;
  isPublished: boolean;
  isPublic: boolean;
  createdAt: string;
  questions: Question[];
}

export interface QuizListItem {
  id: string;
  title: string;
  description: string | null;
  isPublished: boolean;
  isPublic: boolean;
  questionCount: number;
  createdAt: string;
}

/** Item da listagem pública — inclui o autor */
export interface PublicQuizListItem {
  id: string;
  title: string;
  description: string | null;
  isPublished: boolean;
  questionCount: number;
  authorName: string;
  createdAt: string;
}

/** Documento completo enviado no upsert único (POST /api/quizzes) */
export interface QuizSavePayload {
  /** presente = edição, ausente = criação */
  id?: string;
  title: string;
  description: string | null;
  isPublished: boolean;
  isPublic: boolean;
  questions: Array<{
    /** presente = atualizar; ausente = criar */
    id?: string;
    text: string;
    questionType: "multiple_choice" | "true_false";
    basePoints: number;
    imageUrl?: string | null;
    alternatives: Array<{
      /** presente = atualizar; ausente = criar */
      id?: string;
      text: string;
      isCorrect: boolean;
      imageUrl?: string | null;
    }>;
  }>;
}
