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
} from "drizzle-orm/pg-core";

export const fooStatusEnum = pgEnum("foo_status", [
  "active",
  "inactive",
  "pending",
  "archived",
]);

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  role: userRoleEnum("role").notNull().default("user"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

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
  ]
);

export const bar = pgTable(
  "bar",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    foo_id: uuid("foo_id").notNull().references(() => foo.id),
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
  ]
);

export type DbUsers = typeof users.$inferSelect;
export type NewDbUsers = typeof users.$inferInsert;
export type DbFoo = typeof foo.$inferSelect;
export type NewDbFoo = typeof foo.$inferInsert;
export type DbBar = typeof bar.$inferSelect;
export type NewDbBar = typeof bar.$inferInsert;


