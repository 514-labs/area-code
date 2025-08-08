ALTER TABLE "foo_bar" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "foo_bar" CASCADE;--> statement-breakpoint
ALTER TABLE "foo" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "foo" ALTER COLUMN "score" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "foo" ALTER COLUMN "score" SET DEFAULT '0.00';--> statement-breakpoint
CREATE INDEX "bar_created_at_idx" ON "bar" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "bar_foo_id_idx" ON "bar" USING btree ("foo_id");--> statement-breakpoint
CREATE INDEX "foo_created_at_idx" ON "foo" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "foo_score_idx" ON "foo" USING btree ("score");--> statement-breakpoint
CREATE INDEX "foo_score_time_idx" ON "foo" USING btree ("created_at","score");--> statement-breakpoint
ALTER TABLE "foo" DROP COLUMN "config";