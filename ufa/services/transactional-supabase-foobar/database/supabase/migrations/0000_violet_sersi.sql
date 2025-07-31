DO $$ BEGIN
 CREATE TYPE "foo_status" AS ENUM('active', 'inactive', 'pending', 'archived');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bar" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"foo_id" uuid NOT NULL,
	"value" integer NOT NULL,
	"label" varchar(100),
	"notes" text,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "foo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"status" "foo_status" DEFAULT 'active' NOT NULL,
	"priority" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}',
	"config" json DEFAULT '{}',
	"tags" text[] DEFAULT '{}',
	"score" numeric(10,2) DEFAULT '0.00',
	"large_text" text DEFAULT '',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "foo_bar" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"foo_id" uuid NOT NULL,
	"bar_id" uuid NOT NULL,
	"relationship_type" varchar(50) DEFAULT 'default',
	"metadata" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bar" ADD CONSTRAINT "bar_foo_id_foo_id_fk" FOREIGN KEY ("foo_id") REFERENCES "foo"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "foo_bar" ADD CONSTRAINT "foo_bar_foo_id_foo_id_fk" FOREIGN KEY ("foo_id") REFERENCES "foo"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "foo_bar" ADD CONSTRAINT "foo_bar_bar_id_bar_id_fk" FOREIGN KEY ("bar_id") REFERENCES "bar"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
