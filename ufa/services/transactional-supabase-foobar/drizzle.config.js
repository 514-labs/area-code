import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/database/schema.ts",
  out: "./database/supabase/migrations", // Output to Supabase migrations directory
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.SUPABASE_CONNECTION_STRING,
  },
  schemaFilter: ["public"],
  verbose: true,
  strict: true,
});
