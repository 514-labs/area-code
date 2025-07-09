#!/usr/bin/env tsx

import { db, pool } from "../database/connection";
import { foo, bar } from "../database/schema";
import { config as dotenvConfig } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Get current directory in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file in parent directory
dotenvConfig({ path: path.resolve(__dirname, "../../.env") });

async function main() {
  console.log("🌱 Seeding database...");

  try {
    // Clear existing data
    console.log("🧹 Clearing existing data...");
    await db.delete(bar);
    await db.delete(foo);

    // Insert test foo items
    console.log("📦 Creating foo items...");
    const fooItems = await db
      .insert(foo)
      .values([
        {
          name: "Test Foo 1",
          description: "This is the first test foo item",
          status: "active",
          priority: 1,
          isActive: true,
        },
        {
          name: "Test Foo 2",
          description: "This is the second test foo item",
          status: "inactive",
          priority: 2,
          isActive: false,
        },
        {
          name: "High Priority Foo",
          description: "This is a high priority foo item",
          status: "active",
          priority: 5,
          isActive: true,
        },
      ])
      .returning();

    console.log(`✅ Created ${fooItems.length} foo items`);

    // Insert test bar items
    console.log("📊 Creating bar items...");
    const barItems = await db
      .insert(bar)
      .values([
        {
          fooId: fooItems[0].id,
          value: 100,
          label: "First Bar",
          notes: "This bar belongs to the first foo",
          isEnabled: true,
        },
        {
          fooId: fooItems[0].id,
          value: 150,
          label: "Second Bar",
          notes: "This is another bar for the first foo",
          isEnabled: true,
        },
        {
          fooId: fooItems[1].id,
          value: 200,
          label: "Third Bar",
          notes: "This bar belongs to the second foo",
          isEnabled: false,
        },
        {
          fooId: fooItems[2].id,
          value: 500,
          label: "High Value Bar",
          notes: "This is a high value bar for high priority foo",
          isEnabled: true,
        },
      ])
      .returning();

    console.log(`✅ Created ${barItems.length} bar items`);

    console.log("🎉 Database seeding completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`   Foo items: ${fooItems.length}`);
    console.log(`   Bar items: ${barItems.length}`);
    console.log("\n🚀 You can now start the server with: npm run dev");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
