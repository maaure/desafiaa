/** Fabrica de chaves Redis. Centraliza o formato para evitar erros de digitacao. */
export const keys = {
  /** Status da sessao: "lobby" | "playing" | "finished" */
  sessionStatus: (pin: string) => `pin:${pin}:status` as const,

  /** Config da sessao: { quiz_id, time_limit_seconds, current_question_index } */
  sessionConfig: (pin: string) => `pin:${pin}:config` as const,

  /** Set de socket_ids dos players na sessao */
  sessionPlayers: (pin: string) => `pin:${pin}:players` as const,

  /** Dados de um player especifico: { nickname, total_score } */
  sessionPlayer: (pin: string, socketId: string) =>
    `pin:${pin}:player:${socketId}` as const,

  /** Sorted Set de pontuacoes: { socket_id: score } */
  sessionScores: (pin: string) => `pin:${pin}:scores` as const,

  /** Respostas de uma pergunta: Hash { player_nickname -> { answer, response_ms, points } } */
  questionAnswers: (pin: string, questionIndex: number) =>
    `pin:${pin}:answers:q:${questionIndex}` as const,

  /** Timestamp de quando a pergunta foi revelada (TTL 10s) */
  questionRevealed: (pin: string, questionIndex: number) =>
    `pin:${pin}:q:${questionIndex}:revealed` as const,

  /** Lookup reverso PIN -> sessionId UUID (TTL 24h) */
  pinLookup: (pin: string) => `pin:lookup:${pin}` as const,
};
