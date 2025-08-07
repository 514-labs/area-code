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
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
// Import models from the shared package
import type {
  Foo,
  CreateFoo,
  UpdateFoo,
  Bar,
  CreateBar,
  UpdateBar,
} from "@workspace/models";

// Create PostgreSQL enum for status
export const fooStatusEnum = pgEnum("foo_status", [
  "active",
  "inactive",
  "pending",
  "archived",
]);

// Foo table - matches models package exactly
export const foo = pgTable("foo", {
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
});

// Bar table - matches models package exactly
export const bar = pgTable("bar", {
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
});

// FooBar junction table - many-to-many relationship
export const fooBar = pgTable("foo_bar", {
  id: uuid("id").primaryKey().defaultRandom(),
  foo_id: uuid("foo_id")
    .notNull()
    .references(() => foo.id),
  bar_id: uuid("bar_id")
    .notNull()
    .references(() => bar.id),
  relationship_type: varchar("relationship_type", { length: 50 }).default(
    "default"
  ),
  metadata: text("metadata"), // JSON string for additional data
  created_at: timestamp("created_at").defaultNow(),
});

// Zod schemas for validation
export const insertFooSchema = createInsertSchema(foo);
export const selectFooSchema = createSelectSchema(foo);

export const insertBarSchema = createInsertSchema(bar);
export const selectBarSchema = createSelectSchema(bar);

export const insertFooBarSchema = createInsertSchema(fooBar);
export const selectFooBarSchema = createSelectSchema(fooBar);

// Export models from shared package - these now match the database exactly
export type { Foo, CreateFoo, UpdateFoo, Bar, CreateBar, UpdateBar };

// Drizzle inferred types now match the models exactly
export type DbFoo = typeof foo.$inferSelect;
export type NewDbFoo = typeof foo.$inferInsert;

export type DbBar = typeof bar.$inferSelect;
export type NewDbBar = typeof bar.$inferInsert;

export type FooBar = typeof fooBar.$inferSelect;
export type NewFooBar = typeof fooBar.$inferInsert;
