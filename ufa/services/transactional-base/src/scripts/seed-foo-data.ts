import { db } from "../database/connection.js";
import { foo, type NewDbFoo } from "../database/schema.js";
import { sql } from "drizzle-orm";

// Define status values directly to avoid import issues
const FOO_STATUSES: ("active" | "inactive" | "pending" | "archived")[] = ["active", "inactive", "pending", "archived"];

// Helper function to generate random data
function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomScore(min: number = 0, max: number = 100): string {
  return (Math.random() * (max - min) + min).toFixed(2);
}

// Sample data pools for generating realistic content
const sampleNames = [
  "Analytics Dashboard",
  "User Management System",
  "Payment Gateway",
  "Notification Service",
  "Data Pipeline",
  "API Gateway",
  "Authentication Module",
  "Report Generator",
  "Content Manager",
  "Email Service",
  "File Storage",
  "Cache Layer",
  "Monitoring System",
  "Task Scheduler",
  "Search Engine",
  "Recommendation Engine",
  "Chat Service",
  "Video Processor",
  "Image Optimizer",
  "Security Scanner",
  "Backup Service",
  "Load Balancer",
  "Database Connector",
  "Message Queue",
  "Webhook Handler",
  "Rate Limiter",
  "Feature Flags",
  "A/B Testing",
  "Analytics Tracker",
  "Error Logger",
];

const sampleDescriptions = [
  "A comprehensive solution for managing complex workflows",
  "High-performance service designed for scalability",
  "Secure and reliable system with advanced features",
  "User-friendly interface with modern design patterns",
  "Automated processing with intelligent algorithms",
  "Real-time data processing and analytics",
  "Enterprise-grade security and compliance",
  "Microservice architecture with container support",
  "Cloud-native solution with auto-scaling",
  "API-first design with extensive documentation",
  null, // Some records will have null descriptions
  "Legacy system modernization project",
  "Machine learning powered insights",
  "Multi-tenant SaaS platform",
  "Event-driven architecture implementation",
];

const sampleTags = [
  ["production", "critical"],
  ["development", "testing"],
  ["staging", "review"],
  ["monitoring", "alerts"],
  ["security", "compliance"],
  ["performance", "optimization"],
  ["api", "integration"],
  ["frontend", "ui"],
  ["backend", "database"],
  ["analytics", "reporting"],
  ["automation", "workflow"],
  ["maintenance", "upgrade"],
  ["experimental", "beta"],
  ["deprecated", "legacy"],
  [],
];

const sampleMetadata = [
  { environment: "production", version: "1.0.0", owner: "team-alpha" },
  { environment: "staging", version: "2.1.0", owner: "team-beta" },
  { environment: "development", version: "3.0.0-rc1", owner: "team-gamma" },
  { department: "engineering", cost_center: "CC-001", region: "us-east-1" },
  { project: "modernization", timeline: "Q4 2024", budget: 50000 },
  { compliance: ["SOC2", "GDPR"], audit_date: "2024-01-15" },
  { performance: { cpu_limit: "2cores", memory_limit: "4GB" } },
  { integrations: ["salesforce", "hubspot", "stripe"] },
  {},
];

function generateFooData(): NewDbFoo {
  const nameIndex = getRandomNumber(0, sampleNames.length - 1);
  const name = `${sampleNames[nameIndex]} ${getRandomNumber(1000, 9999)}`;
  
  return {
    name,
    description: getRandomElement(sampleDescriptions),
    status: getRandomElement(FOO_STATUSES),
    priority: getRandomNumber(1, 10),
    isActive: Math.random() > 0.2, // 80% chance of being active
    metadata: getRandomElement(sampleMetadata),
    config: {},
    tags: getRandomElement(sampleTags),
    score: getRandomScore(0, 100),
    largeText: `Generated content for ${name}. This is a longer text field that contains detailed information about the item. It includes various details that might be relevant for testing and demonstration purposes. The content is automatically generated with timestamp: ${new Date().toISOString()}`,
  };
}

async function seedFooData(count: number = 1000) {
  console.log(`🌱 Starting to seed ${count} Foo records...`);
  
  try {
    const startTime = Date.now();
    
    // Generate data in batches for better performance
    const batchSize = 100;
    const batches = Math.ceil(count / batchSize);
    let totalInserted = 0;
    
    for (let batch = 0; batch < batches; batch++) {
      const currentBatchSize = Math.min(batchSize, count - totalInserted);
      const batchData: NewDbFoo[] = [];
      
      // Generate data for current batch
      for (let i = 0; i < currentBatchSize; i++) {
        batchData.push(generateFooData());
      }
      
      // Insert batch
      const result = await db.insert(foo).values(batchData).returning({ id: foo.id });
      totalInserted += result.length;
      
      console.log(`✅ Batch ${batch + 1}/${batches} completed: ${result.length} records inserted (Total: ${totalInserted}/${count})`);
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`🎉 Successfully inserted ${totalInserted} Foo records in ${duration}ms`);
    console.log(`📊 Average: ${(duration / totalInserted).toFixed(2)}ms per record`);
    
    // Show some statistics
    const totalResult = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(foo);
      
    console.log(`📈 Database now contains ${totalResult[0]?.count || 0} total Foo records`);
    
  } catch (error) {
    console.error("❌ Error seeding data:", error);
    throw error;
  }
}

// Main execution
async function main() {
  const count = process.argv[2] ? parseInt(process.argv[2], 10) : 1000;
  
  if (isNaN(count) || count <= 0) {
    console.error("❌ Invalid count. Please provide a positive number.");
    process.exit(1);
  }
  
  if (count > 10000) {
    console.warn("⚠️  Warning: Inserting more than 10,000 records. This might take a while...");
  }
  
  try {
    await seedFooData(count);
    console.log("✅ Seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { seedFooData };