import Fastify from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { writeFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { fooRoutes } from "./routes/foo";
import { barRoutes } from "./routes/bar";

// Load environment variables from .env file in parent directory
import { config as dotenvConfig } from "dotenv";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file in parent directory
dotenvConfig({ path: path.resolve(__dirname, "../.env") });

const fastify = Fastify({
  logger: {
    level: "info",
    transport:
      process.env.NODE_ENV === "development"
        ? { target: "pino-pretty" }
        : undefined,
  },
});

// Setup function to register all plugins
async function setupServer() {
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
        title: "Transactional SQL Server Service API",
        version: "1.0.0",
        description:
          "Transactional service with foo and bar entities using SQL Server and Tedious driver",
      },
    },
  } as any);

  await fastify.register(swaggerUi, {
    routePrefix: "/docs", // Swagger UI served at /docs
  });

  // Register route plugins
  await fastify.register(fooRoutes, { prefix: "/api" });
  await fastify.register(barRoutes, { prefix: "/api" });
}

// Health check route
fastify.get("/health", async (request, reply) => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

// API info route
fastify.get("/", async (request, reply) => {
  return {
    name: "Transactional SQL Server Service API",
    version: "1.0.0", 
    description:
      "Transactional service with foo and bar entities using SQL Server and Tedious driver (replaces transactional-base)",
    endpoints: {
      foo: "/api/foo",
      bar: "/api/bar",
      health: "/health",
      dbInfo: "/db-info",
      docs: "/docs",
    },
  };
});

// Database info route (since tables are created by seed script)
fastify.get("/db-info", async (request, reply) => {
  return {
    message: "Database tables are managed by seed-sqlserver.py script",
    note: "Table counts available via individual API endpoints",
    timestamp: new Date().toISOString()
  };
});

// Manual OpenAPI documentation endpoints
fastify.get("/documentation/json", async (request, reply) => {
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

// Start server
const start = async () => {
  try {
    // Setup all plugins and routes first
    await setupServer();
    
    const port = parseInt(process.env.PORT || "8085");
    const host = process.env.HOST || "0.0.0.0";

    // Ensure all routes are registered so Swagger captures them
    await fastify.ready();

    // Generate and save OpenAPI YAML file to project root
    const openapiYaml = fastify.swagger({ yaml: true }) as string;
    const outputPath = resolve(__dirname, "../openapi.yml");
    writeFileSync(outputPath, openapiYaml);
    fastify.log.info(`📄 OpenAPI specification generated at ${outputPath}`);

    await fastify.listen({ port, host });

    fastify.log.info(
      `🚀 Transactional SQL Server service is running on http://${host}:${port} (replacing transactional-base)`
    );
    fastify.log.info("📊 Available endpoints:");
    fastify.log.info("  GET  / - API information");
    fastify.log.info("  GET  /health - Health check");
    fastify.log.info("  GET  /db-info - Database information");
    fastify.log.info("  GET  /docs - Swagger UI documentation");
    fastify.log.info("  GET  /documentation/json - OpenAPI JSON spec");
    fastify.log.info("  GET  /documentation/yaml - OpenAPI YAML spec");
    fastify.log.info("  GET  /api/foo - List all foo items");
    fastify.log.info("  POST /api/foo - Create foo item");
    fastify.log.info("  GET  /api/bar - List all bar items");
    fastify.log.info("  POST /api/bar - Create bar item");
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
