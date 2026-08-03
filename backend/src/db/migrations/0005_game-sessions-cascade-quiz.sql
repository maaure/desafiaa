ALTER TABLE "game_sessions" DROP CONSTRAINT "game_sessions_quiz_id_quizzes_id_fk";
--> statement-breakpoint
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;