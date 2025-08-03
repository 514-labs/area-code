import { FastifyInstance } from "fastify";
import { executeQuery } from "../database/connection";
import {
  GetBarsAverageValueResponse,
  GetBarsParams,
  GetBarsResponse,
  BarWithFoo,
  BulkDeleteBarsRequest,
  BulkDeleteBarsResponse,
  DeleteBarResponse,
  GetBarsByFooIdResponse,
} from "@workspace/models/bar";
import { Bar, CreateBar, UpdateBar } from "@workspace/models/bar";

export async function barRoutes(fastify: FastifyInstance) {
  // Simple test endpoint to verify database connectivity
  fastify.get("/bar/test", async (request, reply) => {
    try {
      console.log("Testing bar database connection...");
      const result = await executeQuery<{ count: number }>(
        "USE sqlCDC; SELECT COUNT(*) as count FROM bar"
      );
      console.log("Bar test query result:", result);
      return reply.send({
        message: "Bar database test successful",
        count: result[0]?.count || 0,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error("Bar test error:", err);
      return reply.status(500).send({ 
        error: "Bar database test failed",
        message: err instanceof Error ? err.message : String(err)
      });
    }
  });

  // Simple DELETE test endpoint
  fastify.delete("/bar/test-delete", async (request, reply) => {
    try {
      console.log("🗑️ TEST DELETE endpoint called");
      return reply.send({ message: "Test delete endpoint works", success: true });
    } catch (err) {
      console.error("Test delete error:", err);
      return reply.status(500).send({ error: "Test delete failed" });
    }
  });

  // Simple bar endpoint without parameters for testing
  fastify.get("/bar/simple", async (request, reply) => {
    try {
      console.log("Testing simple bar data retrieval...");
      const result = await executeQuery<any>(
        "USE sqlCDC; SELECT TOP 5 id, foo_id, value, label, notes, is_enabled, created_at, updated_at FROM bar ORDER BY created_at DESC"
      );
      console.log("Simple bar query result count:", result.length);
      return reply.send({
        message: "Simple bar query successful",
        data: result,
        count: result.length,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error("Simple bar query error:", err);
      return reply.status(500).send({ 
        error: "Simple bar query failed",
        message: err instanceof Error ? err.message : String(err)
      });
    }
  });

  // Get average value of all bar items with query time
  fastify.get<{
    Reply: GetBarsAverageValueResponse | { error: string };
  }>("/bar/average-value", async (request, reply) => {
    try {
      const startTime = Date.now();

      const result = await executeQuery<{ averageValue: number; count: number }>(
        "USE sqlCDC; SELECT AVG(CAST(value AS DECIMAL(10,2))) as averageValue, COUNT(*) as count FROM bar"
      );

      const queryTime = Date.now() - startTime;

      return reply.send({
        averageValue: result[0]?.averageValue || 0,
        count: result[0]?.count || 0,
        queryTime,
      });
    } catch (err) {
      console.error("Error calculating average value:", err);
      return reply
        .status(500)
        .send({ error: "Failed to calculate average value" });
    }
  });

  // Get all bar items with pagination and sorting (fixed version)
  fastify.get<{
    Querystring: GetBarsParams;
    Reply: GetBarsResponse | { error: string };
  }>("/bar", async (request, reply) => {
    try {
      const limit = request.query.limit || 10;
      const offset = request.query.offset || 0;
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

      // Build ORDER BY clause with table aliases
      let orderByClause = "b.created_at DESC"; // default
      if (sortBy) {
        const direction = sortOrder.toUpperCase() === "DESC" ? "DESC" : "ASC";
        switch (sortBy) {
          case "label":
            orderByClause = `b.label ${direction}`;
            break;
          case "value":
            orderByClause = `b.value ${direction}`;
            break;
          case "is_enabled":
            orderByClause = `b.is_enabled ${direction}`;
            break;
          case "created_at":
            orderByClause = `b.created_at ${direction}`;
            break;
          case "updated_at":
            orderByClause = `b.updated_at ${direction}`;
            break;
          default:
            orderByClause = "b.created_at DESC";
        }
      }

      console.log(`Bar query: limit=${limit}, offset=${offset}, orderBy=${orderByClause}`);

      // Query with JOIN to include foo data (matching BarWithFoo type)
      const dataResult = await executeQuery<any>(
        `USE sqlCDC; 
         SELECT 
           b.id,
           b.foo_id,
           b.value,
           b.label,
           b.notes,
           b.is_enabled,
           b.created_at,
           b.updated_at,
           f.id as foo_id_inner,
           f.name as foo_name,
           f.description as foo_description,
           f.status as foo_status,
           f.priority as foo_priority,
           f.is_active as foo_is_active,
           f.metadata as foo_metadata,
           f.tags as foo_tags,
           f.created_at as foo_created_at,
           f.updated_at as foo_updated_at,
           f.score as foo_score,
           f.large_text as foo_large_text
         FROM bar b
         INNER JOIN foo f ON b.foo_id = f.id
         ORDER BY ${orderByClause}
         OFFSET ${offset} ROWS 
         FETCH NEXT ${limit} ROWS ONLY`
      );

      console.log(`Bar query returned ${dataResult.length} rows`);

      // Transform joined data into BarWithFoo format
      const transformedData: BarWithFoo[] = dataResult.map((row: any) => ({
        id: row.id,
        foo_id: row.foo_id,
        value: row.value,
        label: row.label,
        notes: row.notes,
        is_enabled: row.is_enabled,
        created_at: row.created_at,
        updated_at: row.updated_at,
        foo: {
          id: row.foo_id_inner,
          name: row.foo_name,
          description: row.foo_description,
          status: row.foo_status,
          priority: row.foo_priority,
          is_active: row.foo_is_active,
          metadata: row.foo_metadata ? JSON.parse(row.foo_metadata) : {},
          tags: row.foo_tags ? JSON.parse(row.foo_tags) : [],
          created_at: row.foo_created_at,
          updated_at: row.foo_updated_at,
          score: row.foo_score,
          large_text: row.foo_large_text,
        },
      }));

      // Get total count for pagination metadata (with same JOIN)
      const totalResult = await executeQuery<{ count: number }>(
        "USE sqlCDC; SELECT COUNT(*) as count FROM bar b INNER JOIN foo f ON b.foo_id = f.id"
      );

      const queryTime = Date.now() - startTime;
      const total = totalResult[0]?.count || 0;
      const hasMore = offset + limit < total;

      return reply.send({
        data: transformedData,
        pagination: {
          limit,
          offset,
          total,
          hasMore,
        },
        queryTime,
      });
    } catch (err) {
      console.error("Error fetching bars - DETAILED ERROR:", err);
      console.error("Error stack:", err instanceof Error ? err.stack : "No stack trace");
      fastify.log.error("Error fetching bars:", err);
      return reply.status(500).send({ error: "Failed to fetch bar items" });
    }
  });

  // Get bar by ID with foo details
  fastify.get<{
    Params: { id: string };
    Reply: BarWithFoo | { error: string };
  }>("/bar/:id", async (request, reply) => {
    try {
      const { id } = request.params;

      const result = await executeQuery<any>(
        `USE sqlCDC; 
         SELECT 
           b.id,
           b.foo_id,
           b.value,
           b.label,
           b.notes,
           b.is_enabled,
           b.created_at,
           b.updated_at,
           f.id as foo_id_inner,
           f.name as foo_name,
           f.description as foo_description,
           f.status as foo_status,
           f.priority as foo_priority,
           f.is_active as foo_is_active,
           f.metadata as foo_metadata,
           f.tags as foo_tags,
           f.created_at as foo_created_at,
           f.updated_at as foo_updated_at,
           f.score as foo_score,
           f.large_text as foo_large_text
         FROM bar b
         INNER JOIN foo f ON b.foo_id = f.id
         WHERE b.id = @id`,
        { id }
      );

      if (result.length === 0) {
        return reply.status(404).send({ error: "Bar not found" });
      }

      const row = result[0];
      const barWithFoo: BarWithFoo = {
        id: row.id,
        foo_id: row.foo_id,
        value: row.value,
        label: row.label,
        notes: row.notes,
        is_enabled: row.is_enabled,
        created_at: row.created_at,
        updated_at: row.updated_at,
        foo: {
          id: row.foo_id_inner,
          name: row.foo_name,
          description: row.foo_description,
          status: row.foo_status,
          priority: row.foo_priority,
          is_active: row.foo_is_active,
          metadata: row.foo_metadata ? JSON.parse(row.foo_metadata) : {},
          tags: row.foo_tags ? JSON.parse(row.foo_tags) : [],
          created_at: row.foo_created_at,
          updated_at: row.foo_updated_at,
          score: row.foo_score,
          large_text: row.foo_large_text,
        },
      };

      return reply.send(barWithFoo);
    } catch (err) {
      console.error("Error fetching bar:", err);
      return reply.status(500).send({ error: "Failed to fetch bar" });
    }
  });

  // Create new bar
  fastify.post<{ Body: CreateBar; Reply: Bar | { error: string } }>(
    "/bar",
    async (request, reply) => {
      try {
        const { foo_id, value, label, notes, is_enabled = true } = request.body;

        // Verify that foo exists
        const fooExists = await executeQuery<any>(
          "USE sqlCDC; SELECT id FROM foo WHERE id = @foo_id",
          { foo_id }
        );

        if (fooExists.length === 0) {
          return reply
            .status(400)
            .send({ error: "Referenced foo does not exist" });
        }

        const result = await executeQuery<Bar>(
          `USE sqlCDC; 
           INSERT INTO bar (foo_id, value, label, notes, is_enabled) 
           OUTPUT INSERTED.*
           VALUES (@foo_id, @value, @label, @notes, @is_enabled)`,
          { foo_id, value, label, notes, is_enabled }
        );

        if (result.length === 0) {
          return reply.status(500).send({ error: "Failed to create bar record" });
        }

        return reply.status(201).send(result[0]);
      } catch (err) {
        console.error("Create bar error:", err);
        return reply.status(400).send({ error: "Invalid bar data" });
      }
    }
  );

  // Update bar
  fastify.put<{
    Params: { id: string };
    Body: UpdateBar;
    Reply: Bar | { error: string };
  }>("/bar/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      const updateData = {
        ...request.body,
        updated_at: new Date(),
      };

      // If updating foo_id, verify that foo exists
      if (updateData.foo_id) {
        const fooExists = await executeQuery<any>(
          "USE sqlCDC; SELECT id FROM foo WHERE id = @foo_id",
          { foo_id: updateData.foo_id }
        );

        if (fooExists.length === 0) {
          return reply
            .status(400)
            .send({ error: "Referenced foo does not exist" });
        }
      }

      // Build dynamic update query
      const updateFields = [];
      const updateParams: any = { id };

      if (updateData.foo_id !== undefined) {
        updateFields.push("foo_id = @foo_id");
        updateParams.foo_id = updateData.foo_id;
      }
      if (updateData.value !== undefined) {
        updateFields.push("value = @value");
        updateParams.value = updateData.value;
      }
      if (updateData.label !== undefined) {
        updateFields.push("label = @label");
        updateParams.label = updateData.label;
      }
      if (updateData.notes !== undefined) {
        updateFields.push("notes = @notes");
        updateParams.notes = updateData.notes;
      }
      if (updateData.is_enabled !== undefined) {
        updateFields.push("is_enabled = @is_enabled");
        updateParams.is_enabled = updateData.is_enabled;
      }
      if (updateData.updated_at !== undefined) {
        updateFields.push("updated_at = @updated_at");
        updateParams.updated_at = updateData.updated_at;
      }

      if (updateFields.length === 0) {
        return reply.status(400).send({ error: "No fields to update" });
      }

      const result = await executeQuery<Bar>(
        `USE sqlCDC; 
         UPDATE bar 
         SET ${updateFields.join(", ")}
         OUTPUT INSERTED.*
         WHERE id = @id`,
        updateParams
      );

      if (result.length === 0) {
        return reply.status(404).send({ error: "Bar not found" });
      }

      return reply.send(result[0]);
    } catch (err) {
      console.error("Update bar error:", err);
      return reply.status(400).send({ error: "Failed to update bar" });
    }
  });

  // Delete bar
  fastify.delete<{
    Params: { id: string };
    Reply: DeleteBarResponse | { error: string };
  }>("/bar/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      console.log("🗑️  DELETE /api/bar/:id called with ID:", id);
      console.log("🗑️  ID type:", typeof id);
      console.log("🗑️  ID length:", id.length);
      
      // First, let's check if the bar exists
      console.log("🔍 Checking if bar exists before deletion...");
      const existsResult = await executeQuery<any>(
        "USE sqlCDC; SELECT id, foo_id, label FROM bar WHERE id = @id",
        { id }
      );
      console.log("🔍 Exists query result:", existsResult);
      console.log("🔍 Found bars count:", existsResult.length);
      
      if (existsResult.length === 0) {
        console.log("❌ Bar not found during existence check");
        return reply.status(404).send({ error: "Bar not found" });
      }
      
      console.log("✅ Bar found, proceeding with deletion...");
      console.log("📝 Executing DELETE query (without OUTPUT)...");
      
      // Try simple delete without OUTPUT clause first
      const result = await executeQuery<any>(
        "USE sqlCDC; DELETE FROM bar WHERE id = @id",
        { id }
      );
      
      console.log("🗑️  Delete query result:", result);
      console.log("🗑️  Deleted rows count:", result.length);

      console.log("✅ Bar deleted successfully");
      return reply.send({ success: true });
    } catch (err) {
      console.error("❌ Delete bar error - FULL DETAILS:", err);
      console.error("❌ Error message:", err instanceof Error ? err.message : String(err));
      console.error("❌ Error stack:", err instanceof Error ? err.stack : "No stack trace");
      console.error("❌ Error type:", typeof err);
      console.error("❌ Error constructor:", err?.constructor?.name);
      return reply.status(500).send({ error: "Failed to delete bar" });
    }
  });

  // Bulk delete bar items
  fastify.delete<{
    Body: BulkDeleteBarsRequest;
    Reply: BulkDeleteBarsResponse | { error: string };
  }>("/bar", async (request, reply) => {
    try {
      const { ids } = request.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return reply.status(400).send({ error: "Invalid or empty ids array" });
      }

      // Validate that all IDs are strings
      if (!ids.every((id) => typeof id === "string")) {
        return reply.status(400).send({ error: "All IDs must be strings" });
      }

      // Build parameterized query for bulk delete
      const placeholders = ids.map((_, index) => `@id${index}`).join(",");
      const params: Record<string, string> = {};
      ids.forEach((id, index) => {
        params[`id${index}`] = id;
      });

      const result = await executeQuery<Bar>(
        `USE sqlCDC; DELETE FROM bar OUTPUT DELETED.* WHERE id IN (${placeholders})`,
        params
      );

      return reply.send({
        success: true,
        deletedCount: result.length,
      });
    } catch (err) {
      console.error("Error in bulk delete:", err);
      return reply.status(500).send({ error: "Failed to delete bar items" });
    }
  });

  // Get bars by foo ID
  fastify.get<{ 
    Params: { fooId: string }; 
    Reply: GetBarsByFooIdResponse | { error: string };
  }>(
    "/foo/:fooId/bars",
    async (request, reply) => {
      try {
        const { fooId } = request.params;
        const bars = await executeQuery<Bar>(
          `USE sqlCDC; 
           SELECT * FROM bar 
           WHERE foo_id = @fooId
           ORDER BY created_at DESC`,
          { fooId }
        );

        return reply.send(bars);
      } catch (err) {
        console.error("Error fetching bars for foo:", err);
        return reply
          .status(500)
          .send({ error: "Failed to fetch bars for foo" });
      }
    }
  );
}
