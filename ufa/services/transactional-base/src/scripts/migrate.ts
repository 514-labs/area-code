#!/usr/bin/env tsx

import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "../database/connection";
import { config as dotenvConfig } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Get current directory in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file in the service root directory
const serviceRoot = path.resolve(__dirname, "../..");
dotenvConfig({ path: path.join(serviceRoot, ".env") });

async function waitForDatabase(maxRetries = 30, delayMs = 1000) {
  console.log("🔗 Waiting for database connection...");

  for (let i = 0; i < maxRetries; i++) {
    try {
      await pool.query("SELECT 1");
      console.log("✅ Database connection established!");
      return;
    } catch (error) {
      console.log(
        `⏳ Attempt ${i + 1}/${maxRetries} - Database not ready yet...`
      );
      console.error(error);
      if (i === maxRetries - 1) {
        throw new Error(
          `Failed to connect to database after ${maxRetries} attempts: ${error}`
        );
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function main() {
  console.log("🔄 Running database migrations...");

  try {
    // Wait for database to be ready first
    await waitForDatabase();

    // Use absolute path to migrations folder
    const migrationsFolder = path.join(serviceRoot, "migrations");
    console.log(`📁 Using migrations folder: ${migrationsFolder}`);

    // Run migrations
    await migrate(db, { migrationsFolder });
    console.log("✅ Database migrations completed successfully");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
