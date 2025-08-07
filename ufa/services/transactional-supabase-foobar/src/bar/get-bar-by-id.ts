import { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../database/connection";
import { bar, foo } from "../database/schema";
import { BarWithFoo } from "@workspace/models/bar";

async function getBarById(id: string): Promise<BarWithFoo> {
  const barWithFoo = await db
    .select({
      id: bar.id,
      foo_id: bar.fooId,
      value: bar.value,
      label: bar.label,
      notes: bar.notes,
      is_enabled: bar.isEnabled,
      created_at: bar.createdAt,
      updated_at: bar.updatedAt,
      foo: {
        id: foo.id,
        name: foo.name,
        description: foo.description,
        status: foo.status,
        priority: foo.priority,
        is_active: foo.isActive,
        metadata: foo.metadata,
        tags: foo.tags,
        created_at: foo.createdAt,
        updated_at: foo.updatedAt,
        score: foo.score,
      },
    })
    .from(bar)
    .innerJoin(foo, eq(bar.fooId, foo.id))
    .where(eq(bar.id, id))
    .limit(1);

  if (barWithFoo.length === 0) {
    throw new Error("Bar not found");
  }

  return barWithFoo[0] as unknown as BarWithFoo;
}

export function getBarByIdEndpoint(fastify: FastifyInstance) {
  fastify.get<{
    Params: { id: string };
    Reply: BarWithFoo | { error: string };
  }>("/bar/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      const result = await getBarById(id);
      return reply.send(result);
    } catch (error) {
      console.error("Error fetching bar:", error);
      if (error instanceof Error && error.message === "Bar not found") {
        return reply.status(404).send({ error: error.message });
      }
      return reply.status(500).send({ error: "Failed to fetch bar" });
    }
  });
}
