CREATE INDEX "foo_tags_gin_idx" ON "foo" USING gin ("tags");--> statement-breakpoint
DROP POLICY "bar_cud_admin_only" ON "bar" CASCADE;--> statement-breakpoint
DROP POLICY "foo_cud_admin_only" ON "foo" CASCADE;--> statement-breakpoint
CREATE POLICY "bar_insert_admin_only" ON "bar" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (public.user_is_admin());--> statement-breakpoint
CREATE POLICY "bar_update_admin_only" ON "bar" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (true) WITH CHECK (public.user_is_admin());--> statement-breakpoint
CREATE POLICY "bar_delete_admin_only" ON "bar" AS PERMISSIVE FOR DELETE TO "authenticated" USING (public.user_is_admin());--> statement-breakpoint
CREATE POLICY "foo_insert_admin_only" ON "foo" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (public.user_is_admin());--> statement-breakpoint
CREATE POLICY "foo_update_admin_only" ON "foo" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (true) WITH CHECK (public.user_is_admin());--> statement-breakpoint
CREATE POLICY "foo_delete_admin_only" ON "foo" AS PERMISSIVE FOR DELETE TO "authenticated" USING (public.user_is_admin());