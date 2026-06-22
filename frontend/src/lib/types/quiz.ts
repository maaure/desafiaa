// Derived from backend src/db/schema.ts and src/modules/quiz/quiz.schema.ts

export interface Alternative {
  id: string;
  text: string;
  isCorrect: boolean;
  sortOrder: number;
}

export interface Question {
  id: string;
  text: string;
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
  createdAt: string;
  questions: Question[];
}

export interface QuizListItem {
  id: string;
  title: string;
  description: string | null;
  isPublished: boolean;
  questionCount: number;
  createdAt: string;
}
