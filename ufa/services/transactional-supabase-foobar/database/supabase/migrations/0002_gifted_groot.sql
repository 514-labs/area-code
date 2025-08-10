ALTER TABLE "bar" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "foo" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "bar_updated_at_idx" ON "bar" USING btree ("updated_at");--> statement-breakpoint
CREATE POLICY "bar_read_all" ON "bar" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "bar_write_admin_only" ON "bar" AS PERMISSIVE FOR ALL TO "authenticated" USING ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'admin') WITH CHECK ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'admin');--> statement-breakpoint
CREATE POLICY "foo_read_all" ON "foo" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "foo_write_admin_only" ON "foo" AS PERMISSIVE FOR ALL TO "authenticated" USING ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'admin') WITH CHECK ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'admin');