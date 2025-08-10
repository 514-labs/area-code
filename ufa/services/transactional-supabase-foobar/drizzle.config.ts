import { defineConfig } from "drizzle-kit";
import { getSupabaseConnectionString } from "./src/env-vars.js";

export default defineConfig({
  schema: "./src/database/schema.ts",
  out: "./database/supabase/migrations", // Output to Supabase migrations directory
  dialect: "postgresql",
  dbCredentials: {
    url: getSupabaseConnectionString(),
  },
  schemaFilter: ["public"],
  verbose: true,
  strict: true,
});
