import { defineConfig } from "drizzle-kit";
import { config as dotenvConfig } from "dotenv";

// Load environment variables from current directory
dotenvConfig({ path: ".env.development" });
dotenvConfig({ path: ".env.local" });

if (!process.env.SUPABASE_CONNECTION_STRING) {
  throw new Error("SUPABASE_CONNECTION_STRING is not set");
}

const connectionString: string = process.env.SUPABASE_CONNECTION_STRING;

export default defineConfig({
  schema: "./src/database/schema.ts",
  out: "./database/supabase/migrations", // Output to Supabase migrations directory
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
