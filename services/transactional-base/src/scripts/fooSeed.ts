import { FooStatus } from "@workspace/models";

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
];

const largeTextTemplates = [
  "This is a comprehensive documentation section that contains detailed information about the system architecture, implementation details, and best practices for maintenance and troubleshooting.",
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
  "Technical specifications and requirements for this component include specific hardware requirements, software dependencies, configuration parameters, and performance benchmarks that must be met.",
  "Operational procedures for deployment, monitoring, and maintenance of this system component. Includes step-by-step instructions for common administrative tasks and emergency procedures.",
  "Historical context and evolution of this system component, including major version changes, architectural decisions, and lessons learned from previous implementations.",
  "Performance metrics and benchmarking data collected over time, including response times, throughput measurements, error rates, and resource utilization statistics.",
  "Security considerations and compliance requirements for this component, including access controls, encryption standards, audit logging, and regulatory compliance measures.",
  "Integration guidelines and API documentation for connecting this component with other systems, including authentication requirements, data formats, and error handling procedures.",
];

export function generateRandomFooData() {
  return {
    name: randomChoice(fooNames),
    description: randomChoice(descriptions),
    status: randomChoice(Object.values(FooStatus)),
    priority: randomInt(1, 10),
    isActive: randomBoolean(),
    metadata: randomChoice(metadataTemplates),
    config: randomChoice(configTemplates),
    tags: randomChoice(tagSets),
    score: randomFloat(0, 100).toFixed(2),
    largeText: randomChoice(largeTextTemplates),
  };
}

export function generateFooSeedData(count: number = 75) {
  return Array.from({ length: count }, generateRandomFooData);
}
