import { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { getDrizzleSupabaseClient } from "../database/connection";
import { bar, foo } from "../database/schema";
import { BarWithFoo } from "@workspace/models/bar";

async function getBarById(id: string, authToken?: string): Promise<BarWithFoo> {
  const client = await getDrizzleSupabaseClient(authToken);
  const barWithFoo = await client.runTransaction(async (tx) => {
    return await tx
      .select({
        id: bar.id,
        foo_id: bar.foo_id,
        value: bar.value,
        label: bar.label,
        notes: bar.notes,
        is_enabled: bar.is_enabled,
        created_at: bar.created_at,
        updated_at: bar.updated_at,
        foo: {
          id: foo.id,
          name: foo.name,
          description: foo.description,
          status: foo.status,
          priority: foo.priority,
          is_active: foo.is_active,
          metadata: foo.metadata,
          tags: foo.tags,
          created_at: foo.created_at,
          updated_at: foo.updated_at,
          score: foo.score,
        },
      })
      .from(bar)
      .innerJoin(foo, eq(bar.foo_id, foo.id))
      .where(eq(bar.id, id))
      .limit(1);
  });

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
      const authToken = request.headers.authorization?.replace("Bearer ", "");
      const result = await getBarById(request.params.id, authToken);
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
