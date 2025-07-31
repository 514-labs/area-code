import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

let connectionString: string;

if (process.env.NODE_ENV === "production") {
  if (!process.env.SUPABASE_CONNECTION_STRING) {
    throw new Error(
      "SUPABASE_CONNECTION_STRING environment variable is required for production"
    );
  }
  connectionString = process.env.SUPABASE_CONNECTION_STRING;
  console.log("🔗 Production: Using SUPABASE_CONNECTION_STRING");
} else {
  connectionString =
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
  console.log("🔗 Development: Using Supabase CLI");
}

const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool, { schema });

export { pool };
