CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
ALTER TABLE "users" ADD CONSTRAINT "users_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.user_is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT role = 'admin' FROM public.users WHERE id = auth.uid()),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_is_admin() TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE "bar" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "foo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

CREATE INDEX "bar_updated_at_idx" ON "bar" USING btree ("updated_at");--> statement-breakpoint
CREATE POLICY "bar_read_all" ON "bar" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "bar_cud_admin_only" ON "bar" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.user_is_admin()) WITH CHECK (public.user_is_admin());--> statement-breakpoint
CREATE POLICY "foo_read_all" ON "foo" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "foo_cud_admin_only" ON "foo" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.user_is_admin()) WITH CHECK (public.user_is_admin());--> statement-breakpoint
CREATE POLICY "users_read_own" ON "users" AS PERMISSIVE FOR SELECT TO "authenticated" USING (id = auth.uid());