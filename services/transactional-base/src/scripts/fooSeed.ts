import { FooStatus } from "@workspace/models";
import { randomUUID } from "crypto";
import { db } from "../database/connection";
import { foo } from "../database/schema";
import { sql } from "drizzle-orm";

// Configuration for large-scale seeding
const SEED_CONFIG = {
  BATCH_SIZE: 50, // Even smaller batch size to reduce WAL pressure
  PROGRESS_INTERVAL: 5_000, // More frequent progress updates
  BATCH_DELAY_MS: 100, // 100ms delay between batches to allow WAL cleanup
  CHECKPOINT_INTERVAL: 50, // Force checkpoint every 50 batches
};

// Helper functions for generating random data
const randomChoice = <T>(array: T[]): T =>
  array[Math.floor(Math.random() * array.length)];
const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min: number, max: number): number =>
  Math.random() * (max - min) + min;
const randomBoolean = (): boolean => Math.random() < 0.5;

const fooNames = [
  "Analytics Dashboard",
  "User Management",
  "Payment Gateway",
  "Email Service",
  "Authentication System",
  "File Storage",
  "Search Engine",
  "Chat System",
  "Notification Service",
  "Content Management",
  "API Gateway",
  "Database Backup",
  "Log Aggregator",
  "Monitoring Service",
  "Cache Layer",
  "Load Balancer",
  "Image Processor",
  "Video Transcoder",
  "PDF Generator",
  "Report Builder",
  "Workflow Engine",
  "Task Scheduler",
  "Event Streaming",
  "Data Pipeline",
  "Machine Learning",
  "AI Assistant",
  "Security Scanner",
  "Backup Service",
  "Inventory System",
  "Order Processing",
  "Customer Support",
  "Marketing Tool",
  "Social Media",
  "Blog Platform",
  "Forum System",
  "Wiki Platform",
  "Document Editor",
  "Spreadsheet Tool",
  "Presentation App",
  "Drawing Board",
  "Calendar System",
  "Time Tracker",
  "Project Manager",
  "Team Collaboration",
  "Code Repository",
  "Build System",
  "Deployment Tool",
  "Testing Framework",
  "Performance Monitor",
  "Error Tracking",
  "User Analytics",
  "A/B Testing",
  "Data Warehouse",
  "ETL Pipeline",
  "Message Queue",
  "Service Mesh",
  "Container Registry",
  "Secrets Manager",
  "Config Service",
  "Health Check",
  "Rate Limiter",
  "Circuit Breaker",
  "Feature Flags",
  "Audit Logger",
  "Compliance Tool",
  "Backup System",
  "Disaster Recovery",
  "Metrics Collection",
  "Alerting System",
  "Incident Response",
  "Runbook Manager",
  "Knowledge Base",
  "Documentation Hub",
  "Change Management",
  "Release Pipeline",
  "Quality Assurance",
  "Security Audit",
  "Penetration Testing",
  "Vulnerability Scanner",
  "Threat Detection",
  "Access Control",
  "Identity Provider",
  "Single Sign-On",
  "Multi-Factor Auth",
  "Password Manager",
  "Session Manager",
  "Token Service",
  "Encryption Service",
  "Key Management",
  "Certificate Authority",
  "Network Monitor",
  "Bandwidth Analyzer",
  "Latency Monitor",
  "Uptime Tracker",
  "Resource Monitor",
  "Cost Optimizer",
  "Usage Analytics",
  "Capacity Planner",
  "Auto Scaler",
  "Load Tester",
  "Stress Tester",
  "Performance Profiler",
  "Memory Analyzer",
  "CPU Monitor",
  "Disk Monitor",
  "Network Analyzer",
  "Database Monitor",
  "Query Optimizer",
  "Index Advisor",
  "Backup Validator",
  "Data Integrity",
  "Sync Service",
  "Replication Manager",
  "Failover System",
  "Chaos Engineering",
  "Experiment Platform",
  "Canary Deployer",
  "Blue-Green Deploy",
  "Rolling Update",
  "Rollback Manager",
];

const descriptions = [
  "A comprehensive solution for managing complex workflows and data processing.",
  "Streamlined interface for enhanced user experience and productivity.",
  "Robust system designed for scalability and high-performance operations.",
  "Innovative platform that integrates seamlessly with existing infrastructure.",
  "Advanced analytics and reporting capabilities for data-driven decisions.",
  "Secure and reliable service with enterprise-grade features.",
  "Real-time processing engine with low-latency response times.",
  "Cloud-native architecture optimized for modern applications.",
  "Intelligent automation system that reduces manual overhead.",
  "Flexible framework supporting multiple integration patterns.",
  "High-throughput system capable of handling millions of requests.",
  "User-friendly interface with intuitive navigation and controls.",
  "Distributed system with fault tolerance and automatic recovery.",
  "Advanced security features including encryption and access controls.",
  "Comprehensive monitoring and alerting system for operational excellence.",
  "Lightweight solution with minimal resource requirements.",
  "Scalable microservice architecture with container support.",
  "Machine learning powered insights and predictive analytics.",
  "Real-time collaboration platform with multi-user support.",
  "Event-driven architecture with asynchronous processing capabilities.",
  "High-availability system with 99.99% uptime guarantee.",
  "Enterprise-grade solution with 24/7 support and monitoring.",
  "Cost-effective platform that reduces operational overhead.",
  "Multi-tenant architecture supporting thousands of organizations.",
  "API-first design enabling seamless third-party integrations.",
  "Compliance-ready solution meeting SOC2, GDPR, and HIPAA standards.",
  "Self-healing system with automatic error detection and recovery.",
  "Containerized solution deployable across multiple cloud providers.",
  "Advanced caching layer improving performance by 10x.",
  "Automated backup and disaster recovery system.",
  "Real-time data synchronization across multiple data centers.",
  "Machine learning algorithms for predictive maintenance.",
  "Zero-downtime deployment with automated rollback capabilities.",
  "Advanced search capabilities with full-text indexing.",
  "Integrated development environment with debugging tools.",
  "Automated testing framework with coverage reporting.",
  "Performance optimization engine with intelligent caching.",
  "Multi-language support with internationalization features.",
  "Advanced workflow engine with visual designer.",
  "Real-time notifications and alerting system.",
];

const tagSets = [
  ["api", "backend", "database"],
  ["frontend", "ui", "react"],
  ["analytics", "data", "reporting"],
  ["security", "auth", "encryption"],
  ["performance", "optimization", "caching"],
  ["cloud", "aws", "serverless"],
  ["ai", "ml", "automation"],
  ["realtime", "websocket", "streaming"],
  ["mobile", "responsive", "pwa"],
  ["testing", "qa", "ci-cd"],
  ["monitoring", "logging", "alerting"],
  ["search", "elasticsearch", "indexing"],
  ["payments", "billing", "subscription"],
  ["email", "notification", "messaging"],
  ["file", "storage", "upload"],
  ["docker", "kubernetes", "containers"],
  ["microservices", "distributed", "scalable"],
  ["backup", "recovery", "disaster"],
  ["compliance", "audit", "governance"],
  ["devops", "infrastructure", "deployment"],
  ["networking", "load-balancing", "cdn"],
  ["database", "sql", "nosql"],
  ["cache", "redis", "memcached"],
  ["queue", "messaging", "async"],
  ["blockchain", "crypto", "defi"],
  ["iot", "sensors", "telemetry"],
  ["edge", "computing", "latency"],
  ["batch", "processing", "etl"],
  ["streaming", "kafka", "realtime"],
  ["graph", "neo4j", "relationships"],
];

const configTemplates = [
  {
    environment: "production",
    version: "1.0.0",
    features: ["logging", "monitoring"],
  },
  {
    environment: "development",
    version: "1.1.0",
    features: ["debug", "hot-reload"],
  },
  {
    environment: "staging",
    version: "1.0.5",
    features: ["testing", "preview"],
  },
  { timeout: 30000, retries: 3, batchSize: 100 },
  { ssl: true, compression: true, cacheEnabled: true },
  { maxConnections: 1000, poolSize: 50, keepAlive: true },
  { autoScale: true, minInstances: 2, maxInstances: 10 },
  { backup: { enabled: true, interval: "daily", retention: 30 } },
  { redis: { host: "localhost", port: 6379, cluster: true } },
  { database: { type: "postgres", pool: 20, timeout: 5000 } },
  { security: { encryption: "AES-256", tokenExpiry: 3600 } },
  { monitoring: { metrics: true, traces: true, logs: true } },
  { scaling: { cpu: 80, memory: 85, instances: 5 } },
  { network: { bandwidth: "1Gbps", latency: "10ms" } },
  { storage: { type: "SSD", capacity: "1TB", backup: true } },
  { api: { rateLimit: 1000, timeout: 30, version: "v2" } },
];

const metadataTemplates = [
  { department: "Engineering", team: "Backend", owner: "tech-team" },
  { department: "Product", team: "Frontend", owner: "product-team" },
  { department: "Data", team: "Analytics", owner: "data-team" },
  { region: "us-east-1", zone: "1a", instance: "m5.large" },
  { cost: 150.75, budget: 200, lastReview: "2024-01-15" },
  { compliance: ["SOC2", "GDPR"], certifications: ["ISO27001"] },
  { dependencies: ["service-a", "service-b"], upstream: ["gateway"] },
  { maintainer: "john.doe@company.com", oncall: "team-alpha" },
  { region: "us-west-2", zone: "2b", instance: "c5.xlarge" },
  { region: "eu-west-1", zone: "1c", instance: "r5.2xlarge" },
  { department: "DevOps", team: "Infrastructure", owner: "ops-team" },
  { department: "Security", team: "InfoSec", owner: "sec-team" },
  { cost: 89.32, budget: 100, lastReview: "2024-02-01" },
  { cost: 245.67, budget: 300, lastReview: "2024-01-20" },
  { cost: 512.45, budget: 600, lastReview: "2024-01-10" },
  { compliance: ["HIPAA", "PCI-DSS"], certifications: ["FedRAMP"] },
  { compliance: ["SOX", "GDPR"], certifications: ["ISO27001", "SOC2"] },
  { dependencies: ["auth-service", "user-db"], upstream: ["api-gateway"] },
  {
    dependencies: ["payment-api", "notification-service"],
    upstream: ["web-app"],
  },
  { maintainer: "jane.smith@company.com", oncall: "team-beta" },
  { maintainer: "bob.johnson@company.com", oncall: "team-gamma" },
  { maintainer: "alice.brown@company.com", oncall: "team-delta" },
];

const largeTextTemplates = [
  "This is a comprehensive documentation section that contains detailed information about the system architecture, implementation details, and best practices for maintenance and troubleshooting. It includes performance tuning guidelines, security considerations, and operational procedures.",
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
  "Technical specifications and requirements for this component include specific hardware requirements, software dependencies, configuration parameters, and performance benchmarks that must be met. The system requires minimum 8GB RAM, 4 CPU cores, and 100GB storage space.",
  "Operational procedures for deployment, monitoring, and maintenance of this system component. Includes step-by-step instructions for common administrative tasks and emergency procedures. Regular maintenance windows should be scheduled monthly.",
  "Historical context and evolution of this system component, including major version changes, architectural decisions, and lessons learned from previous implementations. The system has undergone 5 major revisions since its initial deployment.",
  "Performance metrics and benchmarking data collected over time, including response times, throughput measurements, error rates, and resource utilization statistics. Average response time is 150ms with 99.9% uptime.",
  "Security considerations and compliance requirements for this component, including access controls, encryption standards, audit logging, and regulatory compliance measures. All data is encrypted at rest and in transit.",
  "Integration guidelines and API documentation for connecting this component with other systems, including authentication requirements, data formats, and error handling procedures. RESTful APIs with OpenAPI 3.0 specification.",
  "Disaster recovery and business continuity planning documentation including backup procedures, recovery time objectives (RTO), recovery point objectives (RPO), and failover mechanisms. RTO is 4 hours, RPO is 1 hour.",
  "Monitoring and alerting configuration including key performance indicators (KPIs), threshold values, escalation procedures, and dashboard configurations. Critical alerts are sent to on-call team within 2 minutes.",
];

export function generateRandomFooData(index?: number) {
  const uniqueId = index ? `_${index}` : `_${randomUUID().slice(0, 8)}`;

  return {
    name: `${randomChoice(fooNames)}${uniqueId}`,
    description: randomChoice(descriptions),
    status: randomChoice(Object.values(FooStatus)),
    priority: randomInt(1, 10),
    isActive: randomBoolean(),
    metadata: {
      ...randomChoice(metadataTemplates),
      generatedAt: new Date().toISOString(),
      uniqueId: uniqueId,
      batchId: Math.floor(Math.random() * 1000000),
    },
    config: {
      ...randomChoice(configTemplates),
      instanceId: randomUUID(),
      generatedAt: new Date().toISOString(),
    },
    tags: [
      ...randomChoice(tagSets),
      `batch-${Math.floor(Math.random() * 1000)}`,
    ],
    score: randomFloat(0, 100).toFixed(2),
    largeText:
      randomChoice(largeTextTemplates) +
      ` Generated at ${new Date().toISOString()} with unique identifier ${uniqueId}.`,
  };
}

export function generateFooSeedData(count: number = 2_000_000) {
  console.log(`🔄 Generating ${count.toLocaleString()} foo records...`);

  const data = [];
  for (let i = 0; i < count; i++) {
    data.push(generateRandomFooData(i));

    // Log progress for large datasets
    if (i > 0 && i % 100_000 === 0) {
      console.log(`📊 Generated ${i.toLocaleString()} records...`);
    }
  }

  console.log(`✅ Completed generating ${count.toLocaleString()} foo records`);
  return data;
}

export function generateFooSeedDataBatch(
  batchSize: number = 50,
  batchIndex: number = 0
) {
  const data = [];
  const startIndex = batchIndex * batchSize;

  for (let i = 0; i < batchSize; i++) {
    data.push(generateRandomFooData(startIndex + i));
  }

  return data;
}

export async function seedFooInBatches(totalCount: number) {
  console.log(
    `🚀 Starting batch insertion of ${totalCount.toLocaleString()} foo records...`
  );
  console.log(
    `📊 Batch size: ${SEED_CONFIG.BATCH_SIZE.toLocaleString()} records per batch`
  );
  console.log(
    `⏱️  Batch delay: ${SEED_CONFIG.BATCH_DELAY_MS}ms between batches`
  );
  console.log(
    `🔄 Checkpoint interval: every ${SEED_CONFIG.CHECKPOINT_INTERVAL} batches`
  );

  const totalBatches = Math.ceil(totalCount / SEED_CONFIG.BATCH_SIZE);
  let insertedCount = 0;

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const currentBatchSize = Math.min(
      SEED_CONFIG.BATCH_SIZE,
      totalCount - insertedCount
    );

    try {
      // Generate batch data
      const batchData = generateFooSeedDataBatch(currentBatchSize, batchIndex);

      // Debug: Log first record structure (only once)
      if (batchIndex === 0) {
        console.log(`🔍 Sample record structure:`, Object.keys(batchData[0]));
        console.log(`🔍 Records in batch: ${batchData.length}`);
      }

      // Insert batch with transaction
      await db.transaction(async (tx) => {
        await tx.insert(foo).values(batchData);
      });

      insertedCount += currentBatchSize;

      // Force checkpoint periodically to manage WAL files
      if (
        batchIndex > 0 &&
        batchIndex % SEED_CONFIG.CHECKPOINT_INTERVAL === 0
      ) {
        console.log(
          `🔧 Triggering database checkpoint at batch ${batchIndex + 1}...`
        );
        try {
          await db.execute(sql`CHECKPOINT`);
        } catch (checkpointError) {
          console.warn(
            `⚠️  Checkpoint failed but continuing: ${checkpointError}`
          );
        }
      }

      // Log progress
      if (
        insertedCount % SEED_CONFIG.PROGRESS_INTERVAL === 0 ||
        batchIndex === totalBatches - 1
      ) {
        const percentage = ((insertedCount / totalCount) * 100).toFixed(1);
        console.log(
          `📈 Progress: ${insertedCount.toLocaleString()}/${totalCount.toLocaleString()} (${percentage}%) - Batch ${batchIndex + 1}/${totalBatches}`
        );
      }

      // Memory management - force garbage collection periodically
      if (batchIndex % 100 === 0 && global.gc) {
        global.gc();
      }

      // Add delay between batches to allow PostgreSQL to manage WAL files
      if (batchIndex < totalBatches - 1) {
        // Don't delay after the last batch
        await new Promise((resolve) =>
          setTimeout(resolve, SEED_CONFIG.BATCH_DELAY_MS)
        );
      }
    } catch (error) {
      console.error(`❌ Error inserting batch ${batchIndex + 1}:`, error);
      console.error(`🔍 Batch size attempted: ${currentBatchSize}`);
      console.error(`🔍 Total batches: ${totalBatches}`);
      console.error(`🔍 Current batch index: ${batchIndex}`);
      console.error(
        `🔍 Records inserted so far: ${insertedCount.toLocaleString()}`
      );

      // Try to checkpoint on error to clean up WAL
      try {
        console.log(`🔧 Attempting emergency checkpoint...`);
        await db.execute(sql`CHECKPOINT`);
      } catch (checkpointError) {
        console.error(
          `💥 Emergency checkpoint also failed: ${checkpointError}`
        );
      }

      throw error;
    }
  }

  // Final checkpoint
  try {
    console.log(`🔧 Final checkpoint...`);
    await db.execute(sql`CHECKPOINT`);
  } catch (checkpointError) {
    console.warn(`⚠️  Final checkpoint failed: ${checkpointError}`);
  }

  return insertedCount;
}

export async function seedFooTable(fooCount: number) {
  const insertedCount = await seedFooInBatches(fooCount);
  console.log(
    `✅ Created ${insertedCount.toLocaleString()} foo items using batch insertion`
  );

  // For batch mode, select a sample for bar creation
  return await db.select().from(foo).limit(100);
}
