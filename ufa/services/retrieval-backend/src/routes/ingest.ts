import { FastifyPluginAsync } from "fastify";
import { esClient } from "../elasticsearch/client";
import { FOO_INDEX, BAR_INDEX } from "../elasticsearch/indices";

// Type definitions for ingestion data
type FooData = {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "inactive" | "pending" | "archived";
  priority: number;
  isActive: boolean;
  metadata: Record<string, any>;
  tags: string[];
  score: number;
  largeText: string;
  createdAt: string | Date;
  updatedAt: string | Date;
};

type BarData = {
  id: string;
  fooId: string;
  value: number;
  label: string | null;
  notes: string | null;
  isEnabled: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
};

// Type definitions for request data
type FooIngestRequest = {
  action: "index" | "delete";
  data?: FooData;
};

type BarIngestRequest = {
  action: "index" | "delete";
  data?: BarData;
};

export const ingestRoutes: FastifyPluginAsync = async (fastify) => {
  // Ingest foo data
  fastify.post(
    "/ingest/foo",
    {
      schema: {
        body: {
          type: "object",
          required: ["action"],
          properties: {
            action: { type: "string", enum: ["index", "delete"] },
            data: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                description: { type: ["string", "null"] },
                status: {
                  type: "string",
                  enum: ["active", "inactive", "pending", "archived"],
                },
                priority: { type: "number" },
                isActive: { type: "boolean" },
                metadata: { type: "object" },
                tags: { type: "array", items: { type: "string" } },
                score: { type: "number" },
                largeText: { type: "string" },
                createdAt: { type: "string" },
                updatedAt: { type: "string" },
              },
            },
          },
        },
        response: {
          200: {
            type: "object",
            required: ["success", "action", "documentId"],
            properties: {
              success: { type: "boolean" },
              action: { type: "string" },
              documentId: { type: "string" },
            },
          },
          400: {
            type: "object",
            required: ["error", "details"],
            properties: {
              error: { type: "string" },
              details: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { action, data } = request.body as FooIngestRequest;

        if (action === "index" && !data) {
          reply.status(400);
          return {
            error: "Data is required for index action",
            details: "Must provide foo data when action is 'index'",
          };
        }

        if (action === "delete" && !data?.id) {
          reply.status(400);
          return {
            error: "Document ID is required for delete action",
            details: "Must provide foo data with id when action is 'delete'",
          };
        }

        fastify.log.info(
          `📥 Received foo ${action} request for ID: ${data?.id}`
        );

        switch (action) {
          case "index":
            // Index or update the document
            await esClient.index({
              index: FOO_INDEX,
              id: data!.id,
              body: data,
              refresh: "wait_for", // Make changes immediately searchable
            });
            fastify.log.info(`✅ Indexed foo document: ${data!.id}`);
            break;

          case "delete":
            // Delete the document
            try {
              await esClient.delete({
                index: FOO_INDEX,
                id: data!.id,
                refresh: "wait_for",
              });
              fastify.log.info(`🗑️  Deleted foo document: ${data!.id}`);
            } catch (error: any) {
              if (error.meta?.body?.result === "not_found") {
                fastify.log.warn(
                  `⚠️  Foo document not found for deletion: ${data!.id}`
                );
              } else {
                throw error;
              }
            }
            break;

          default:
            throw new Error(`Unknown action: ${action}`);
        }

        return {
          success: true,
          action: action,
          documentId: data!.id,
        };
      } catch (error: any) {
        fastify.log.error(`❌ Error processing foo request: ${error.message}`);
        reply.status(400);
        return {
          error: "Failed to process foo request",
          details: error.message,
        };
      }
    }
  );

  // Ingest bar data
  fastify.post(
    "/ingest/bar",
    {
      schema: {
        body: {
          type: "object",
          required: ["action"],
          properties: {
            action: { type: "string", enum: ["index", "delete"] },
            data: {
              type: "object",
              properties: {
                id: { type: "string" },
                fooId: { type: "string" },
                value: { type: "number" },
                label: { type: ["string", "null"] },
                notes: { type: ["string", "null"] },
                isEnabled: { type: "boolean" },
                createdAt: { type: "string" },
                updatedAt: { type: "string" },
              },
            },
          },
        },
        response: {
          200: {
            type: "object",
            required: ["success", "action", "documentId"],
            properties: {
              success: { type: "boolean" },
              action: { type: "string" },
              documentId: { type: "string" },
            },
          },
          400: {
            type: "object",
            required: ["error", "details"],
            properties: {
              error: { type: "string" },
              details: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { action, data } = request.body as BarIngestRequest;

        if (action === "index" && !data) {
          reply.status(400);
          return {
            error: "Data is required for index action",
            details: "Must provide bar data when action is 'index'",
          };
        }

        if (action === "delete" && !data?.id) {
          reply.status(400);
          return {
            error: "Document ID is required for delete action",
            details: "Must provide bar data with id when action is 'delete'",
          };
        }

        fastify.log.info(
          `📥 Received bar ${action} request for ID: ${data?.id}`
        );

        switch (action) {
          case "index":
            // Index or update the document
            await esClient.index({
              index: BAR_INDEX,
              id: data!.id,
              body: data,
              refresh: "wait_for", // Make changes immediately searchable
            });
            fastify.log.info(`✅ Indexed bar document: ${data!.id}`);
            break;

          case "delete":
            // Delete the document
            try {
              await esClient.delete({
                index: BAR_INDEX,
                id: data!.id,
                refresh: "wait_for",
              });
              fastify.log.info(`🗑️  Deleted bar document: ${data!.id}`);
            } catch (error: any) {
              if (error.meta?.body?.result === "not_found") {
                fastify.log.warn(
                  `⚠️  Bar document not found for deletion: ${data!.id}`
                );
              } else {
                throw error;
              }
            }
            break;

          default:
            throw new Error(`Unknown action: ${action}`);
        }

        return {
          success: true,
          action: action,
          documentId: data!.id,
        };
      } catch (error: any) {
        fastify.log.error(`❌ Error processing bar request: ${error.message}`);
        reply.status(400);
        return {
          error: "Failed to process bar request",
          details: error.message,
        };
      }
    }
  );

  // Health check for ingestion endpoints
  fastify.get("/ingest/health", async () => {
    try {
      // Check Elasticsearch connection
      await esClient.ping();
      return {
        status: "healthy",
        elasticsearch: "connected",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: "unhealthy",
        elasticsearch: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      };
    }
  });
};
