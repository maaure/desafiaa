// Tipos do módulo report — entidades de relatório

export interface QuestionReport {
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

export interface SessionReportFull {
  session: {
    id: string;
    pin: string;
    status: string;
    playerCount: number;
    timeLimitSeconds: number;
    startedAt: string | null;
    finishedAt: string | null;
  };
  results: {
    nickname: string;
    totalScore: number;
    correctCount: number;
    totalCount: number;
    avgResponseMs: number;
    rank: number;
  }[];
  answers: {
    questionText: string;
    nickname: string;
    selectedAnswer: string;
    isCorrect: boolean;
    responseMs: number;
    pointsEarned: number;
    answeredAt: string;
  }[];
}
