import { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../database/connection";
import { foo, type Foo } from "../database/schema";
import { convertDbFooToModel } from "./foo-utils";

async function getFooById(id: string): Promise<Foo> {
  const fooItem = await db.select().from(foo).where(eq(foo.id, id)).limit(1);

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
        const result = await getFooById(id);
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
