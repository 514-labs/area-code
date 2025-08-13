import { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { getDrizzleSupabaseClient } from "../database/connection";
import { foo, type Foo } from "../database/schema";
import { convertDbFooToModel } from "./foo-utils";

async function getFooById(id: string, authToken?: string): Promise<Foo> {
  const client = await getDrizzleSupabaseClient(authToken);
  const fooItem = await client.runTransaction(async (tx) => {
    return await tx.select().from(foo).where(eq(foo.id, id)).limit(1);
  });

  if (fooItem.length === 0) {
    throw new Error("Foo not found");
  }

  return convertDbFooToModel(fooItem[0]);
}

export function getFooByIdEndpoint(fastify: FastifyInstance) {
  fastify.get<{ Params: { id: string }; Reply: Foo | { error: string } }>(
    "/foo/:id",
    async (request, reply) => {
      try {
        const { id } = request.params;
        const authToken = request.headers.authorization?.replace("Bearer ", "");
        const result = await getFooById(id, authToken);
        return reply.send(result);
      } catch (error) {
        console.error("Fetch error:", error);
        if (error instanceof Error && error.message === "Foo not found") {
          return reply.status(404).send({ error: error.message });
        }
        return reply.status(500).send({ error: "Failed to fetch foo" });
      }
    }
  );
}
