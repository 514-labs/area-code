import { eq } from "drizzle-orm";
import { db } from "../database/connection";
import {
  bar,
  foo,
  insertBarSchema,
  type Bar,
  type CreateBar,
} from "../database/schema";

async function createBar(data: CreateBar): Promise<Bar> {
  const validatedData = insertBarSchema.parse(data);

  // Verify that foo exists
  const fooExists = await db
    .select()
    .from(foo)
    .where(eq(foo.id, validatedData.fooId))
    .limit(1);

  if (fooExists.length === 0) {
    throw new Error("Referenced foo does not exist");
  }

  const newBar = await db.insert(bar).values(validatedData).returning({
    id: bar.id,
    foo_id: bar.fooId,
    value: bar.value,
    label: bar.label,
    notes: bar.notes,
    is_enabled: bar.isEnabled,
    created_at: bar.createdAt,
    updated_at: bar.updatedAt,
  });

  return newBar[0];
}

export function createBarEndpoint(fastify: FastifyInstance) {
  fastify.post<{ Body: CreateBar; Reply: Bar | { error: string } }>(
    "/bar",
    async (request, reply) => {
      try {
        const result = await createBar(request.body);
        return reply.status(201).send(result);
      } catch (error) {
        console.error("Create bar error:", error);
        if (
          error instanceof Error &&
          error.message === "Referenced foo does not exist"
        ) {
          return reply.status(400).send({ error: error.message });
        }
        return reply.status(400).send({ error: "Invalid bar data" });
      }
    }
  );
}
