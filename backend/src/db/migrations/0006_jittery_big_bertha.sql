ALTER TABLE "player_answers" DROP CONSTRAINT "player_answers_question_id_questions_id_fk";
--> statement-breakpoint
ALTER TABLE "player_answers" ADD CONSTRAINT "player_answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;