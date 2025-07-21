#!/usr/bin/env tsx

import { pool } from "../database/connection";
import { config as dotenvConfig } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Get current directory in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the transactional-database service .env file
dotenvConfig({
  path: path.resolve(__dirname, "../../../transactional-database/.env"),
});

// Also load local .env if it exists (for app-specific overrides)
dotenvConfig({ path: path.resolve(__dirname, "../../.env") });

async function waitForPooler(maxRetries = 60, delayMs = 1000) {
  console.log("🔗 Testing connection to database through pooler...");

  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await pool.query(
        "SELECT version() as version, current_database() as database, current_user as user"
      );
      console.log("✅ Successfully connected through pooler!");
      console.log(`   Database: ${result.rows[0].database}`);
      console.log(`   User: ${result.rows[0].user}`);
      console.log(
        `   Version: ${result.rows[0].version.split(" ").slice(0, 2).join(" ")}`
      );
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(
        `⏳ Attempt ${i + 1}/${maxRetries} - Pooler not ready: ${errorMsg}`
      );

      if (i === maxRetries - 1) {
        throw new Error(
          `Failed to connect through pooler after ${maxRetries} attempts`
        );
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return false;
}

async function main() {
  console.log("🚀 Waiting for transactional-database service to be ready...");

  try {
    await waitForPooler();
    console.log("🎉 Database service is ready!");
  } catch (error) {
    console.error("❌ Database service failed to become ready:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
