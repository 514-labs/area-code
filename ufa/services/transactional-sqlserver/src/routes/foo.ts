import { FastifyInstance } from "fastify";
import { executeQuery } from "../database/connection";
import {
  FooStatus,
  GetFoosAverageScoreResponse,
  GetFoosParams,
  GetFoosResponse,
  GetFoosScoreOverTimeParams,
  GetFoosScoreOverTimeResponse,
  type Foo,
  type CreateFoo,
  type UpdateFoo,
} from "@workspace/models/foo";

// Database interface for SQL Server results
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

// Convert database result to API type
function getModelFromDBRow(dbFoo: FooRecord): Foo {
  return {
    id: dbFoo.id,
    name: dbFoo.name,
    description: dbFoo.description,
    status: dbFoo.status as FooStatus,
    priority: dbFoo.priority,
    is_active: dbFoo.is_active,
    metadata: dbFoo.metadata ? JSON.parse(dbFoo.metadata) : {},
    tags: dbFoo.tags ? JSON.parse(dbFoo.tags) : [],
    score: dbFoo.score ? parseFloat(dbFoo.score) : 0,
    large_text: dbFoo.large_text || "",
    created_at: dbFoo.created_at,
    updated_at: dbFoo.updated_at,
  };
}

export async function fooRoutes(fastify: FastifyInstance) {
  // Get average score of all foo items with query time
  fastify.get<{
    Reply: GetFoosAverageScoreResponse | { error: string };
  }>("/foo/average-score", async (request, reply) => {
    try {
      const startTime = Date.now();

      const result = await executeQuery<{ averageScore: number; count: number }>(
        "USE sqlCDC; SELECT AVG(CAST(score AS DECIMAL(10,2))) as averageScore, COUNT(*) as count FROM foo"
      );

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      const averageScore = result[0]?.averageScore || 0;
      const count = result[0]?.count || 0;

      return reply.send({
        averageScore: Number(averageScore),
        queryTime,
        count,
      });
    } catch (error) {
      fastify.log.error("Error calculating average score:", error);
      return reply
        .status(500)
        .send({ error: "Failed to calculate average score" });
    }
  });

  // Get foo score over time with daily aggregations
  fastify.get<{
    Querystring: GetFoosScoreOverTimeParams;
    Reply: GetFoosScoreOverTimeResponse | { error: string };
  }>("/foo/score-over-time", async (request, reply) => {
    try {
      const days = Number(request.query.days) || 90;

      // Validate days parameter
      if (days < 1 || days > 365) {
        return reply
          .status(400)
          .send({ error: "Days must be between 1 and 365" });
      }

      const startTime = Date.now();

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Format dates for SQL Server (YYYY-MM-DD)
      const startDateStr = startDate.toISOString().split("T")[0];
      const endDateStr = endDate.toISOString().split("T")[0];

      // Query to get daily score aggregations using SQL Server date functions
      const result = await executeQuery<{
        date: string;
        averageScore: number;
        totalCount: number;
      }>(
        `USE sqlCDC; 
         SELECT 
           CAST(created_at AS DATE) as date,
           AVG(CAST(score AS DECIMAL(10,2))) as averageScore,
           COUNT(*) as totalCount
         FROM foo 
         WHERE CAST(created_at AS DATE) >= @startDate 
           AND CAST(created_at AS DATE) <= @endDate
           AND score IS NOT NULL
         GROUP BY CAST(created_at AS DATE)
         ORDER BY CAST(created_at AS DATE) ASC`,
        { startDate: startDateStr, endDate: endDateStr }
      );

      const queryTime = Date.now() - startTime;

      // Fill in missing dates with zero values
      const filledData: {
        date: string;
        averageScore: number;
        totalCount: number;
      }[] = [];

      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split("T")[0];
        const existingData = result.find((r) => r.date === dateStr);

        filledData.push({
          date: dateStr,
          averageScore:
            Math.round((Number(existingData?.averageScore) || 0) * 100) / 100, // Round to 2 decimal places
          totalCount: Number(existingData?.totalCount) || 0,
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return reply.send({
        data: filledData,
        queryTime,
      });
    } catch (error) {
      fastify.log.error("Error calculating score over time:", error);
      return reply
        .status(500)
        .send({ error: "Failed to calculate score over time" });
    }
  });

  // Get all foo records with pagination and sorting
  fastify.get<{
    Querystring: GetFoosParams;
    Reply: GetFoosResponse | { error: string };
  }>("/foo", async (request, reply) => {
    try {
      const limit = Number(request.query.limit) || 10;
      const offset = Number(request.query.offset) || 0;
      const sortBy = request.query.sortBy;
      const sortOrder = request.query.sortOrder || "asc";

      // Validate pagination parameters
      if (limit < 1 || limit > 100) {
        return reply
          .status(400)
          .send({ error: "Limit must be between 1 and 100" });
      }
      if (offset < 0) {
        return reply.status(400).send({ error: "Offset must be non-negative" });
      }

      const startTime = Date.now();

      // Build ORDER BY clause (without ORDER BY prefix since it's in the SQL)
      let orderByClause = "created_at DESC"; // default
      if (sortBy) {
        const direction = sortOrder.toUpperCase() === "DESC" ? "DESC" : "ASC";
        switch (sortBy) {
          case "name":
            orderByClause = `name ${direction}`;
            break;
          case "description":
            orderByClause = `description ${direction}`;
            break;
          case "status":
            orderByClause = `status ${direction}`;
            break;
          case "priority":
            orderByClause = `priority ${direction}`;
            break;
          case "is_active":
            orderByClause = `is_active ${direction}`;
            break;
          case "score":
            orderByClause = `score ${direction}`;
            break;
          case "created_at":
            orderByClause = `created_at ${direction}`;
            break;
          case "updated_at":
            orderByClause = `updated_at ${direction}`;
            break;
          default:
            orderByClause = "created_at DESC";
        }
      }

      // Get total count
      const countResult = await executeQuery<{ count: number }>(
        "USE sqlCDC; SELECT COUNT(*) as count FROM foo"
      );
      const total = countResult[0]?.count || 0;

      // Use literal values in SQL to avoid parameterization issues with OFFSET/FETCH
      const dataResult = await executeQuery<FooRecord>(
        `USE sqlCDC; 
         SELECT * FROM foo 
         ORDER BY ${orderByClause}
         OFFSET ${offset} ROWS 
         FETCH NEXT ${limit} ROWS ONLY`
      );

      const queryTime = Date.now() - startTime;
      const hasMore = offset + limit < total;

      const convertedFoo = dataResult.map(getModelFromDBRow);

      return reply.send({
        data: convertedFoo,
        pagination: {
          limit,
          offset,
          total,
          hasMore,
        },
        queryTime,
      });
    } catch (error) {
      fastify.log.error("Error getting foo records:", error);
      return reply.status(500).send({ error: "Failed to fetch foo items" });
    }
  });

  // Get foo by ID
  fastify.get<{ Params: { id: string }; Reply: Foo | { error: string } }>(
    "/foo/:id",
    async (request, reply) => {
      try {
        const { id } = request.params;
        const result = await executeQuery<FooRecord>(
          "USE sqlCDC; SELECT * FROM foo WHERE id = @id",
          { id }
        );

        if (result.length === 0) {
          return reply.status(404).send({ error: "Foo not found" });
        }

        const convertedFoo = getModelFromDBRow(result[0]);
        return reply.send(convertedFoo);
      } catch (error) {
        fastify.log.error("Error getting foo record:", error);
        return reply.status(500).send({ error: "Failed to fetch foo" });
      }
    }
  );

  // Create new foo record
  fastify.post<{
    Body: CreateFoo;
    Reply: Foo | { error: string; details?: string; received?: CreateFoo };
  }>("/foo", async (request, reply) => {
    try {
      console.log(
        "Received request body:",
        JSON.stringify(request.body, null, 2)
      );

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
        return reply.status(500).send({ error: "Failed to create foo record" });
      }

      const convertedFoo = getModelFromDBRow(result[0]);
      return reply.status(201).send(convertedFoo);
    } catch (error) {
      fastify.log.error("Error creating foo record:", error);
      return reply.status(400).send({
        error: "Invalid foo data",
        details: error instanceof Error ? error.message : "Unknown error",
        received: request.body,
      });
    }
  });

  // Update foo record
  fastify.put<{
    Params: { id: string };
    Body: UpdateFoo;
    Reply: Foo | { error: string };
  }>("/foo/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      const updateData = request.body;

      // Build dynamic UPDATE query based on provided fields
      const updateFields: string[] = [];
      const params: any = { id };

      if (updateData.name !== undefined) {
        updateFields.push("name = @name");
        params.name = updateData.name;
      }
      if (updateData.description !== undefined) {
        updateFields.push("description = @description");
        params.description = updateData.description;
      }
      if (updateData.status !== undefined) {
        updateFields.push("status = @status");
        params.status = updateData.status;
      }
      if (updateData.priority !== undefined) {
        updateFields.push("priority = @priority");
        params.priority = updateData.priority;
      }
      if (updateData.is_active !== undefined) {
        updateFields.push("is_active = @is_active");
        params.is_active = updateData.is_active;
      }
      if (updateData.metadata !== undefined) {
        updateFields.push("metadata = @metadata");
        params.metadata = JSON.stringify(updateData.metadata);
      }
      if (updateData.tags !== undefined) {
        updateFields.push("tags = @tags");
        params.tags = JSON.stringify(updateData.tags);
      }
      if (updateData.score !== undefined) {
        updateFields.push("score = @score");
        params.score = updateData.score;
      }
      if (updateData.large_text !== undefined) {
        updateFields.push("large_text = @large_text");
        params.large_text = updateData.large_text;
      }

      // Always update updated_at
      updateFields.push("updated_at = GETDATE()");

      if (updateFields.length === 1) { // Only updated_at
        return reply.status(400).send({ error: "No fields to update" });
      }

      const updateQuery = `
        USE sqlCDC;
        UPDATE foo 
        SET ${updateFields.join(', ')}
        OUTPUT INSERTED.*
        WHERE id = @id
      `;

      const result = await executeQuery<FooRecord>(updateQuery, params);

      if (result.length === 0) {
        return reply.status(404).send({ error: "Foo not found" });
      }

      const convertedFoo = getModelFromDBRow(result[0]);
      return reply.send(convertedFoo);
    } catch (error) {
      fastify.log.error("Error updating foo record:", error);
      return reply.status(400).send({ error: "Failed to update foo" });
    }
  });

  // Delete foo record
  fastify.delete<{
    Params: { id: string };
    Reply: { success: boolean } | { error: string };
  }>("/foo/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      
      // First check if record exists
      const checkResult = await executeQuery<FooRecord>(
        "USE sqlCDC; SELECT id FROM foo WHERE id = @id",
        { id }
      );

      if (checkResult.length === 0) {
        return reply.status(404).send({ error: "Foo not found" });
      }

      await executeQuery(
        "USE sqlCDC; DELETE FROM foo WHERE id = @id",
        { id }
      );

      return reply.send({ success: true });
    } catch (error) {
      fastify.log.error("Error deleting foo record:", error);
      return reply.status(500).send({ error: "Failed to delete foo" });
    }
  });
}
