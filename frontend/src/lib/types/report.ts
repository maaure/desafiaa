export interface QuizReportItem {
  questionId: string;
  text: string;
  totalAnswers: number;
  correctCount: number;
  accuracyRate: number;
  avgResponseMs: number;
}

export interface SessionSummary {
  id: string;
  pin: string;
  status: string;
  playerCount: number;
  startedAt: string | null;
  finishedAt: string | null;
  winner: string | null;
  winnerScore: number | null;
}

export interface SessionReportResult {
  nickname: string;
  totalScore: number;
  correctCount: number;
  totalCount: number;
  avgResponseMs: number;
  rank: number;
}

export interface SessionReportAnswer {
  questionText: string;
  nickname: string;
  selectedAnswer: string;
  isCorrect: boolean;
  responseMs: number;
  pointsEarned: number;
  answeredAt: string;
}

export interface SessionReport {
  session: SessionSummary & { timeLimitSeconds: number };
  results: SessionReportResult[];
  answers: SessionReportAnswer[];
}
