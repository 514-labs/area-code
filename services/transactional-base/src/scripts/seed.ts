#!/usr/bin/env tsx

import { db, pool } from "../database/connection";
import { foo, bar } from "../database/schema";
import { config as dotenvConfig } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { seedFooTable } from "./fooSeed";

// Get current directory in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file in parent directory
dotenvConfig({ path: path.resolve(__dirname, "../../.env") });

// Helper functions for generating random data
const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const randomBoolean = (): boolean => Math.random() < 0.5;

// Configuration for large-scale seeding
const SEED_CONFIG = {
  DEFAULT_FOO_COUNT: 2_000_000, // 2 million rows by default
};

async function main() {
  const args = process.argv.slice(2);
  const countArg = args.find((arg) => arg.startsWith("--count="));

  const fooCount = countArg
    ? parseInt(countArg.split("=")[1])
    : SEED_CONFIG.DEFAULT_FOO_COUNT;

  console.log("🌱 Seeding database with millions of records...");
  console.log(`📊 Configuration:`);
  console.log(`   - Foo records: ${fooCount.toLocaleString()}`);

  const startTime = Date.now();

  try {
    // Clear existing data
    console.log("🧹 Clearing existing data...");
    await db.delete(bar);
    await db.delete(foo);
    console.log("✅ Existing data cleared");

    // Seed foo table
    const fooItems = await seedFooTable(fooCount);

    // Insert test bar items (using some of the created foo items)
    console.log("📊 Creating bar items...");
    const selectedFooItems = fooItems.slice(0, Math.min(50, fooItems.length)); // Use up to 50 foo items
    const barData = [];

    for (const fooItem of selectedFooItems) {
      // Create 1-3 bar items for each foo
      const barCount = randomInt(1, 3);
      for (let i = 0; i < barCount; i++) {
        barData.push({
          fooId: fooItem.id,
          value: randomInt(10, 1000),
          label: `Bar ${i + 1} for ${fooItem.name}`,
          notes: `This bar belongs to ${fooItem.name}`,
          isEnabled: randomBoolean(),
        });
      }
    }

    const barItems = await db.insert(bar).values(barData).returning();
    console.log(`✅ Created ${barItems.length} bar items`);

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log("🎉 Database seeding completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`   Foo items: ${fooCount.toLocaleString()}`);
    console.log(`   Bar items: ${barItems.length}`);
    console.log(`   Duration: ${duration} seconds`);
    console.log(
      `   Rate: ${Math.round(fooCount / parseFloat(duration)).toLocaleString()} records/second`
    );
    console.log("\n🚀 You can now start the server with: npm run dev");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
