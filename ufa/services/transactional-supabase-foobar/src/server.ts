import Fastify from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { writeFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";

import { fooRoutes } from "./routes/foo";
import { barRoutes } from "./routes/bar";
import { chatRoutes } from "./routes/chat";
import { authRoutes } from "./routes/auth";
import {
  bootstrapSloanMCPClient,
  shutdownSloanMCPClient,
} from "./ai/mcp/sloan-mcp-client";
import {
  bootstrapSupabaseLocalMCPClient,
  shutdownSupabaseLocalMCPClient,
} from "./ai/mcp/supabase-mcp-client";

// Load environment variables FIRST, before importing anything that might need them
import { config as dotenvConfig } from "dotenv";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//Load environment variables from .env files in order of precedence
dotenvConfig({ path: path.resolve(__dirname, "../.env") });

if (process.env.NODE_ENV === "development") {
  dotenvConfig({
    path: path.resolve(__dirname, "../.env.development"),
    override: true,
  });
  dotenvConfig({
    path: path.resolve(__dirname, "../.env.local"),
    override: true,
  });
}

const fastify = Fastify({
  logger: {
    level: "info",
    transport: { target: "pino-pretty" },
  },
});

// Register CORS
await fastify.register(cors, {
  origin: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

// Register Swagger (OpenAPI) plugins
await fastify.register(swagger, {
  openapi: {
    info: {
      title: "Transactional Base 2 Service API",
      version: "1.0.0",
      description:
        "Self-hosted Supabase transactional service with foo and bar entities using PostgreSQL and Drizzle ORM",
    },
  },
} as any);

await fastify.register(swaggerUi, {
  routePrefix: "/docs", // Swagger UI served at /docs
});

// Health check route
fastify.get("/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

// API info route
fastify.get("/", async () => {
  return {
    name: "Transactional supabase foobar Service API",
    version: "1.0.0",
    description:
      "Self-hosted Supabase transactional service with foo and bar entities using PostgreSQL and Drizzle ORM",
    endpoints: {
      foo: "/api/foo",
      bar: "/api/bar",
      chat: "/api/chat",
      health: "/health",
      docs: "/docs",
    },
  };
});

// Register route plugins
await fastify.register(fooRoutes, { prefix: "/api" });
await fastify.register(barRoutes, { prefix: "/api" });
await fastify.register(chatRoutes, { prefix: "/api" });
await fastify.register(authRoutes, { prefix: "/api" });

// Manual OpenAPI documentation endpoints
fastify.get("/documentation/json", async () => {
  return fastify.swagger();
});

fastify.get("/documentation/yaml", async (request, reply) => {
  reply.type("text/yaml");
  return fastify.swagger({ yaml: true });
});

// Error handler
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);

  if (error.validation) {
    reply.status(400).send({
      error: "Validation Error",
      message: error.message,
      details: error.validation,
    });
    return;
  }

  reply.status(500).send({
    error: "Internal Server Error",
    message: "Something went wrong",
  });
});

// Bootstrap MCP clients during startup
async function bootstrapMCPClients() {
  try {
    fastify.log.info("🔧 Bootstrapping MCP clients...");

    // Bootstrap both MCP clients in parallel
    await Promise.all([
      bootstrapSloanMCPClient(),
      bootstrapSupabaseLocalMCPClient(),
    ]);

    fastify.log.info("✅ All MCP clients successfully bootstrapped");
  } catch (error) {
    fastify.log.error("❌ Failed to bootstrap MCP clients:", error);
    throw error;
  }
}

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || "8082");
    const host = process.env.HOST || "0.0.0.0";

    // Bootstrap MCP clients before starting the server
    await bootstrapMCPClients();

    // Ensure all routes are registered so Swagger captures them
    await fastify.ready();

    // Generate and save OpenAPI YAML file to project root
    const openapiYaml = fastify.swagger({ yaml: true }) as string;
    const outputPath = resolve(__dirname, "../openapi.yml");
    writeFileSync(outputPath, openapiYaml);
    fastify.log.info(`📄 OpenAPI specification generated at ${outputPath}`);

    await fastify.listen({ port, host });

    fastify.log.info(
      `🚀 Transactional Base 2 service is running on http://${host}:${port}`
    );
    fastify.log.info("📊 Available endpoints:");
    fastify.log.info("  GET  / - API information");
    fastify.log.info("  GET  /health - Health check");
    fastify.log.info("  GET  /docs - Swagger UI documentation");
    fastify.log.info("  GET  /documentation/json - OpenAPI JSON spec");
    fastify.log.info("  GET  /documentation/yaml - OpenAPI YAML spec");
    fastify.log.info("  GET  /api/foo - List all foo items");
    fastify.log.info("  POST /api/foo - Create foo item");
    fastify.log.info("  GET  /api/bar - List all bar items");
    fastify.log.info("  POST /api/bar - Create bar item");
    fastify.log.info("  GET  /api/chat/status - AI chat status check");
    fastify.log.info("  POST /api/chat - AI chat endpoint");
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  fastify.log.info(`Received ${signal}, shutting down gracefully...`);
  try {
    // Shutdown MCP clients first
    fastify.log.info("🔧 Shutting down MCP clients...");
    await Promise.all([
      shutdownSloanMCPClient(),
      shutdownSupabaseLocalMCPClient(),
    ]);
    fastify.log.info("✅ All MCP clients successfully shut down");

    // Then close the Fastify server
    await fastify.close();
    fastify.log.info("Server closed successfully");
    process.exit(0);
  } catch (err) {
    fastify.log.error("Error during shutdown:", err);
    process.exit(1);
  }
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
