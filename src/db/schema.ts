// src/db/schema.ts
import {
  pgTable, uuid, varchar, text, boolean, integer,
  timestamp, uniqueIndex, index, check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const quizzes = pgTable("quizzes", {
  id: uuid("id").defaultRandom().primaryKey(),
  authorId: uuid("author_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  isPublished: boolean("is_published").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index("idx_quizzes_author").on(t.authorId)]);

export const questions = pgTable("questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  quizId: uuid("quiz_id").references(() => quizzes.id, { onDelete: "cascade" }).notNull(),
  text: text("text").notNull(),
  questionType: varchar("question_type", { length: 20 }).notNull(),
  basePoints: integer("base_points").default(1000).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("idx_questions_quiz").on(t.quizId, t.sortOrder),
  check("chk_question_type", sql`${t.questionType} IN ('multiple_choice', 'true_false')`),
  check("chk_base_points", sql`${t.basePoints} > 0`),
]);

export const alternatives = pgTable("alternatives", {
  id: uuid("id").defaultRandom().primaryKey(),
  questionId: uuid("question_id").references(() => questions.id, { onDelete: "cascade" }).notNull(),
  text: text("text").notNull(),
  isCorrect: boolean("is_correct").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
}, (t) => [index("idx_alternatives_question").on(t.questionId)]);

export const gameSessions = pgTable("game_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  quizId: uuid("quiz_id").references(() => quizzes.id).notNull(),
  hostId: uuid("host_id").references(() => users.id).notNull(),
  pin: varchar("pin", { length: 6 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  timeLimitSeconds: integer("time_limit_seconds").default(30).notNull(),
  playerCount: integer("player_count").default(0).notNull(),
  maxPlayers: integer("max_players").default(500).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("idx_sessions_quiz").on(t.quizId),
  uniqueIndex("idx_active_pin").on(t.pin).where(sql`${t.status} != 'finished'`),
  check("chk_session_status", sql`${t.status} IN ('lobby', 'playing', 'finished')`),
  check("chk_time_limit", sql`${t.timeLimitSeconds} BETWEEN 5 AND 300`),
]);

export const playerAnswers = pgTable("player_answers", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").references(() => gameSessions.id, { onDelete: "cascade" }).notNull(),
  questionId: uuid("question_id").references(() => questions.id).notNull(),
  playerNickname: varchar("player_nickname", { length: 50 }).notNull(),
  selectedAnswer: varchar("selected_answer", { length: 255 }).notNull(),
  isCorrect: boolean("is_correct").notNull(),
  responseMs: integer("response_ms").notNull(),
  pointsEarned: integer("points_earned").default(0).notNull(),
  answeredAt: timestamp("answered_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("idx_answers_session").on(t.sessionId),
  index("idx_answers_question").on(t.questionId),
]);

export const gameResults = pgTable("game_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").references(() => gameSessions.id, { onDelete: "cascade" }).notNull(),
  playerNickname: varchar("player_nickname", { length: 50 }).notNull(),
  totalScore: integer("total_score").default(0).notNull(),
  correctCount: integer("correct_count").default(0).notNull(),
  totalCount: integer("total_count").default(0).notNull(),
  avgResponseMs: integer("avg_response_ms").default(0).notNull(),
  rank: integer("rank").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index("idx_results_session").on(t.sessionId, t.rank)]);

// Relações
export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  author: one(users, { fields: [quizzes.authorId], references: [users.id] }),
  questions: many(questions),
  sessions: many(gameSessions),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  quiz: one(quizzes, { fields: [questions.quizId], references: [quizzes.id] }),
  alternatives: many(alternatives),
}));

export const alternativesRelations = relations(alternatives, ({ one }) => ({
  question: one(questions, { fields: [alternatives.questionId], references: [questions.id] }),
}));

export const gameSessionsRelations = relations(gameSessions, ({ one, many }) => ({
  quiz: one(quizzes, { fields: [gameSessions.quizId], references: [quizzes.id] }),
  host: one(users, { fields: [gameSessions.hostId], references: [users.id] }),
  answers: many(playerAnswers),
  results: many(gameResults),
}));

export const playerAnswersRelations = relations(playerAnswers, ({ one }) => ({
  session: one(gameSessions, { fields: [playerAnswers.sessionId], references: [gameSessions.id] }),
  question: one(questions, { fields: [playerAnswers.questionId], references: [questions.id] }),
}));

export const gameResultsRelations = relations(gameResults, ({ one }) => ({
  session: one(gameSessions, { fields: [gameResults.sessionId], references: [gameSessions.id] }),
}));
