import Fastify from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { writeFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { searchRoutes } from "./routes/search";
import { ingestRoutes } from "./routes/ingest";
import { esClient } from "./elasticsearch/client";

const __dirname = dirname(fileURLToPath(import.meta.url));

const fastify = Fastify({
  logger: {
    level: "info",
    transport:
      process.env.NODE_ENV === "development"
        ? { target: "pino-pretty" }
        : undefined,
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
      title: "Retrieval Base Service API",
      version: "1.0.0",
      description:
        "RESTful API for searching foo and bar entities using Elasticsearch",
    },
  },
});

await fastify.register(swaggerUi, {
  routePrefix: "/docs", // Swagger UI served at /docs
});

// Health check route
fastify.get("/health", async (request, reply) => {
  try {
    // Check Elasticsearch connection
    const esHealth = await esClient.cluster.health();
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      elasticsearch: {
        status: esHealth.status,
        cluster: esHealth.cluster_name,
      },
    };
  } catch {
    reply.status(503).send({
      status: "error",
      timestamp: new Date().toISOString(),
      message: "Elasticsearch is not available",
    });
  }
});

// API info route
fastify.get("/", async () => {
  return {
    name: "Retrieval Base Service API",
    version: "1.0.0",
    description:
      "RESTful API for searching foo and bar entities using Elasticsearch",
    endpoints: {
      search: "/api/search",
      searchFoos: "/api/search/foos",
      searchBars: "/api/search/bars",
      ingestFoo: "/api/ingest/foo",
      ingestBar: "/api/ingest/bar",
      ingestHealth: "/api/ingest/health",
      health: "/health",
      docs: "/docs",
    },
  };
});

// Register route plugins
await fastify.register(searchRoutes, { prefix: "/api" });
await fastify.register(ingestRoutes, { prefix: "/api" });

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

// Wait for Elasticsearch to be ready
async function waitForElasticsearch(maxRetries = 30, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await esClient.ping();
      fastify.log.info("✅ Connected to Elasticsearch");
      return true;
    } catch {
      fastify.log.info(
        `⏳ Waiting for Elasticsearch... (${i + 1}/${maxRetries})`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Could not connect to Elasticsearch");
}

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || "8083");
    const host = process.env.HOST || "0.0.0.0";

    // Wait for Elasticsearch (unless in server-only mode)
    if (process.env.SKIP_ES_WAIT !== "true") {
      await waitForElasticsearch();
    } else {
      fastify.log.info(
        "⚠️  Skipping Elasticsearch connection (server-only mode)"
      );
    }

    // Ensure all routes are registered so Swagger captures them
    await fastify.ready();

    // Generate and save OpenAPI YAML file to project root
    const openapiYaml = fastify.swagger({ yaml: true }) as string;
    const outputPath = resolve(__dirname, "../openapi.yml");
    writeFileSync(outputPath, openapiYaml);
    fastify.log.info(`📄 OpenAPI specification generated at ${outputPath}`);

    await fastify.listen({ port, host });

    fastify.log.info(
      `🚀 Retrieval Base service is running on http://${host}:${port}`
    );
    fastify.log.info("📊 Available endpoints:");
    fastify.log.info("  GET  / - API information");
    fastify.log.info("  GET  /health - Health check");
    fastify.log.info("  GET  /docs - Swagger UI documentation");
    fastify.log.info("  GET  /documentation/json - OpenAPI JSON spec");
    fastify.log.info("  GET  /documentation/yaml - OpenAPI YAML spec");
    fastify.log.info("  GET  /api/search - Search all entities");
    fastify.log.info("  GET  /api/search/foos - Search foo entities");
    fastify.log.info("  GET  /api/search/bars - Search bar entities");
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
