import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "../database/connection";

async function runMigrations() {
  console.log("Running database migrations...");

  try {
    await migrate(db, { migrationsFolder: "./migrations" });
    console.log("✅ Migrations completed successfully");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations(); 