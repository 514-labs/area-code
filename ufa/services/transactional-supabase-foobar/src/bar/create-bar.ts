import { eq } from "drizzle-orm";
import { FastifyInstance } from "fastify";
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
    .where(eq(foo.id, validatedData.foo_id))
    .limit(1);

  if (fooExists.length === 0) {
    throw new Error("Referenced foo does not exist");
  }

  const newBar = await db.insert(bar).values(validatedData).returning();

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
