import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  text,
  boolean,
  jsonb,
  decimal,
  pgEnum,
  index,
  pgPolicy,
  pgSchema,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { authenticatedRole, anonRole } from "drizzle-orm/supabase";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import type {
  Foo,
  CreateFoo,
  UpdateFoo,
  Bar,
  CreateBar,
  UpdateBar,
} from "@workspace/models";

const authSchema = pgSchema("auth");
const usersInAuth = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});

// important note: the security definer public.user_is_admin() is defined in migrations/0002_lovely_harrier.sql
// important note: trigger on auth.users automatically creates public.users records

export const fooStatusEnum = pgEnum("foo_status", [
  "active",
  "inactive",
  "pending",
  "archived",
]);

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id")
      .primaryKey()
      .references(() => usersInAuth.id),
    role: userRoleEnum("role").notNull().default("user"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    pgPolicy("users_read_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`id = auth.uid()`,
    }),
  ]
);

export const foo = pgTable(
  "foo",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    status: fooStatusEnum("status").notNull().default("active"),
    priority: integer("priority").notNull().default(1),
    is_active: boolean("is_active").notNull().default(true),
    metadata: jsonb("metadata").default({}),
    tags: text("tags").array().default([]),
    score: decimal("score", { precision: 10, scale: 2 }).default("0.00"),
    large_text: text("large_text").default(""),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("foo_created_at_idx").on(table.created_at),
    index("foo_score_idx").on(table.score),
    index("foo_score_time_idx").on(table.created_at, table.score),
    index("foo_tags_gin_idx").using("gin", table.tags),
    // RLS policies
    pgPolicy("foo_read_all", {
      for: "select",
      to: [authenticatedRole, anonRole],
      using: sql`true`, // Everyone can read
    }),
    pgPolicy("foo_insert_admin_only", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`public.user_is_admin()`,
    }),
    pgPolicy("foo_update_admin_only", {
      for: "update",
      to: authenticatedRole,
      using: sql`true`, // Can see all rows for update
      withCheck: sql`public.user_is_admin()`, // But only admin can actually update
    }),
    pgPolicy("foo_delete_admin_only", {
      for: "delete",
      to: authenticatedRole,
      using: sql`public.user_is_admin()`, // Only admin can delete
    }),
  ]
);

export const bar = pgTable(
  "bar",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    foo_id: uuid("foo_id")
      .notNull()
      .references(() => foo.id),
    value: integer("value").notNull(),
    label: varchar("label", { length: 100 }),
    notes: text("notes"),
    is_enabled: boolean("is_enabled").notNull().default(true),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("bar_created_at_idx").on(table.created_at),
    index("bar_foo_id_idx").on(table.foo_id),
    index("bar_updated_at_idx").on(table.updated_at),
    // RLS policies
    pgPolicy("bar_read_all", {
      for: "select",
      to: [authenticatedRole, anonRole],
      using: sql`true`, // Everyone can read
    }),
    pgPolicy("bar_insert_admin_only", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`public.user_is_admin()`,
    }),
    pgPolicy("bar_update_admin_only", {
      for: "update",
      to: authenticatedRole,
      using: sql`true`, // Can see all rows for update
      withCheck: sql`public.user_is_admin()`, // But only admin can actually update
    }),
    pgPolicy("bar_delete_admin_only", {
      for: "delete",
      to: authenticatedRole,
      using: sql`public.user_is_admin()`, // Only admin can delete
    }),
  ]
);

export const insertUsersSchema = createInsertSchema(users);
export const selectUsersSchema = createSelectSchema(users);

export const insertFooSchema = createInsertSchema(foo);
export const selectFooSchema = createSelectSchema(foo);

export const insertBarSchema = createInsertSchema(bar);
export const selectBarSchema = createSelectSchema(bar);

export type { Foo, CreateFoo, UpdateFoo, Bar, CreateBar, UpdateBar };

export type DbUsers = typeof users.$inferSelect;
export type NewDbUsers = typeof users.$inferInsert;

export type DbFoo = typeof foo.$inferSelect;
export type NewDbFoo = typeof foo.$inferInsert;

export type DbBar = typeof bar.$inferSelect;
export type NewDbBar = typeof bar.$inferInsert;
