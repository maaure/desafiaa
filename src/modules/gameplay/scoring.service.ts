/**
 * Calcula a pontuação de uma resposta.
 *
 * Fórmula: basePoints × (1 - responseMs / timeLimitMs) × accuracy
 *   accuracy = 1 se correta, 0 se errada
 *   piso = 0 (sem pontuação negativa)
 */
export const scoringService = {
  calculate(params: {
    basePoints: number;
    responseMs: number;
    timeLimitSeconds: number;
    isCorrect: boolean;
  }): number {
    if (!params.isCorrect) return 0;

    const timeLimitMs = params.timeLimitSeconds * 1000;
    const speedFactor = 1 - params.responseMs / timeLimitMs;
    // Garante que o fator nunca é negativo (resposta no limite exato)
    const clampedFactor = Math.max(0, speedFactor);
    const score = Math.round(params.basePoints * clampedFactor);
    return Math.max(0, score);
  },
};
