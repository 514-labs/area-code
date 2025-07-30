import { FastifyInstance } from "fastify";
import { executeQuery } from "../database/connection";

// Simple interfaces for basic CRUD operations
interface FooRecord {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: number;
  is_active: boolean;
  metadata: string; // JSON string
  tags: string; // JSON array as string
  score: string; // DECIMAL comes as string
  large_text: string | null;
  created_at: Date;
  updated_at: Date;
}

interface CreateFooRequest {
  name: string;
  description?: string;
  status?: string;
  priority?: number;
  is_active?: boolean;
  metadata?: object;
  tags?: string[];
  score?: number;
  large_text?: string;
}

export async function fooRoutes(fastify: FastifyInstance) {
  // Get all foo records with basic pagination
  fastify.get("/foo", async (request, reply) => {
    try {
      const query = request.query as any;
      const limit = query.limit || 50;
      const offset = query.offset || 0;

      const countResult = await executeQuery<{ count: number }>(
        "USE sqlCDC; SELECT COUNT(*) as count FROM foo"
      );
      const total = countResult[0]?.count || 0;

      const dataResult = await executeQuery<FooRecord>(
        `USE sqlCDC; 
         SELECT * FROM foo 
         ORDER BY created_at DESC 
         OFFSET @offset ROWS 
         FETCH NEXT @limit ROWS ONLY`,
        { offset, limit }
      );

      return {
        data: dataResult,
        total,
        limit,
        offset
      };
    } catch (error) {
      fastify.log.error("Error getting foo records:", error);
      reply.status(500);
      return { error: "Failed to get foo records" };
    }
  });

  // Get foo by ID
  fastify.get<{ Params: { id: string } }>("/foo/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      const result = await executeQuery<FooRecord>(
        "USE sqlCDC; SELECT * FROM foo WHERE id = @id",
        { id }
      );

      if (result.length === 0) {
        reply.status(404);
        return { error: "Foo record not found" };
      }

      return result[0];
    } catch (error) {
      fastify.log.error("Error getting foo record:", error);
      reply.status(500);
      return { error: "Failed to get foo record" };
    }
  });

  // Create new foo record
  fastify.post<{ Body: CreateFooRequest }>("/foo", async (request, reply) => {
    try {
      const {
        name,
        description,
        status = 'active',
        priority = 1,
        is_active = true,
        metadata = {},
        tags = [],
        score = 0,
        large_text
      } = request.body;

      const result = await executeQuery<FooRecord>(
        `USE sqlCDC; 
         INSERT INTO foo (name, description, status, priority, is_active, metadata, tags, score, large_text) 
         OUTPUT INSERTED.*
         VALUES (@name, @description, @status, @priority, @is_active, @metadata, @tags, @score, @large_text)`,
        {
          name,
          description,
          status,
          priority,
          is_active,
          metadata: JSON.stringify(metadata),
          tags: JSON.stringify(tags),
          score,
          large_text
        }
      );

      if (result.length === 0) {
        reply.status(500);
        return { error: "Failed to create foo record" };
      }

      reply.status(201);
      return result[0];
    } catch (error) {
      fastify.log.error("Error creating foo record:", error);
      reply.status(500);
      return { error: "Failed to create foo record" };
    }
  });

  // Delete foo record
  fastify.delete<{ Params: { id: string } }>("/foo/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      
      await executeQuery(
        "USE sqlCDC; DELETE FROM foo WHERE id = @id",
        { id }
      );

      return { message: "Foo record deleted successfully" };
    } catch (error) {
      fastify.log.error("Error deleting foo record:", error);
      reply.status(500);
      return { error: "Failed to delete foo record" };
    }
  });

  // Get average score
  fastify.get("/foo/average-score", async (request, reply) => {
    try {
      const result = await executeQuery<{ averageScore: number; count: number }>(
        "USE sqlCDC; SELECT AVG(CAST(score AS DECIMAL(10,2))) as averageScore, COUNT(*) as count FROM foo"
      );

      return {
        averageScore: result[0]?.averageScore || 0,
        count: result[0]?.count || 0,
        queryTime: Date.now()
      };
    } catch (error) {
      fastify.log.error("Error getting average score:", error);
      reply.status(500);
      return { error: "Failed to get average score" };
    }
  });
}
