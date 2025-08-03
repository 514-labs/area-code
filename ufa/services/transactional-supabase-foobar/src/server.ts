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
import { chatRoutes } from "./routes/chat";
import {
  bootstrapAuroraMCPClient,
  shutdownAuroraMCPClient,
} from "./ai/mcp/aurora-mcp-client";
import {
  bootstrapSupabaseLocalMCPClient,
  shutdownSupabaseLocalMCPClient,
} from "./ai/mcp/supabase-mcp-client";

// Load environment variables from .env file in parent directory
import { config as dotenvConfig } from "dotenv";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env files in order of precedence
dotenvConfig({ path: path.resolve(__dirname, "../.env") });
// .env.development (base development config)
dotenvConfig({ path: path.resolve(__dirname, "../.env.development") });
// .env.local (local overrides)
dotenvConfig({ path: path.resolve(__dirname, "../.env.local") });

// Watch for .env file changes in development
if (
  process.env.NODE_ENV === "development" ||
  process.env.SUPABASE_CLI === "true"
) {
  import("fs").then(({ watch, utimes }) => {
    const envFiles = [".env", ".env.development", ".env.local"];

    envFiles.forEach((file) => {
      const envPath = path.resolve(__dirname, `../${file}`);
      try {
        watch(envPath, (eventType) => {
          if (eventType === "change") {
            console.log(
              `🔄 Environment file ${file} changed, triggering server restart...`
            );
            // Touch the server.ts file to trigger tsx restart
            const serverPath = path.resolve(__dirname, "server.ts");
            const now = new Date();
            utimes(serverPath, now, now, (err) => {
              if (err) {
                console.log(
                  "⚠️  Could not trigger restart, manually restart server"
                );
              }
            });
          }
        });
        console.log(`👀 Watching ${file} for changes...`);
      } catch (err) {
        // File might not exist, that's ok
        console.log(`⚠️  ${file} not found, skipping watch...`);
      }
    });
  });
}

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
<<<<<<<< HEAD:ufa/services/transactional-sqlserver/src/server.ts
    name: "Transactional SQL Server Service API",
    version: "1.0.0", 
========
    name: "Transactional supabase foobar Service API",
    version: "1.0.0",
>>>>>>>> main:ufa/services/transactional-supabase-foobar/src/server.ts
    description:
      "Transactional service with foo and bar entities using SQL Server and Tedious driver (replaces transactional-base)",
    endpoints: {
      foo: "/api/foo",
      bar: "/api/bar",
      chat: "/api/chat",
      health: "/health",
      dbInfo: "/db-info",
      docs: "/docs",
    },
  };
});

<<<<<<<< HEAD:ufa/services/transactional-sqlserver/src/server.ts
// Database info route (since tables are created by seed script)
fastify.get("/db-info", async (request, reply) => {
  return {
    message: "Database tables are managed by seed-sqlserver.py script",
    note: "Table counts available via individual API endpoints",
    timestamp: new Date().toISOString()
  };
});
========
// Register route plugins
await fastify.register(fooRoutes, { prefix: "/api" });
await fastify.register(barRoutes, { prefix: "/api" });
await fastify.register(chatRoutes, { prefix: "/api" });
>>>>>>>> main:ufa/services/transactional-supabase-foobar/src/server.ts

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
  console.error("🚨 GLOBAL ERROR HANDLER - Method:", request.method, "URL:", request.url);
  console.error("🚨 GLOBAL ERROR HANDLER - Error details:", error);
  console.error("🚨 GLOBAL ERROR HANDLER - Error message:", error.message);
  console.error("🚨 GLOBAL ERROR HANDLER - Error stack:", error.stack);
  console.error("🚨 GLOBAL ERROR HANDLER - Error constructor:", error.constructor.name);
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
    actualError: error.message, // Add actual error for debugging
  });
});

// Bootstrap MCP clients during startup
async function bootstrapMCPClients() {
  try {
    fastify.log.info("🔧 Bootstrapping MCP clients...");

    // Bootstrap both MCP clients in parallel
    await Promise.all([
      bootstrapAuroraMCPClient(),
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
    // Setup all plugins and routes first
    await setupServer();
    
    const port = 8085;
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
      shutdownAuroraMCPClient(),
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
