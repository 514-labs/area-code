import { FastifyInstance } from "fastify";
import { getDrizzleSupabaseAdminClient } from "../database/connection";
import { foo, type Foo, type NewDbFoo } from "../database/schema";
import { CreateFoo, FooStatus } from "@workspace/models";
import { convertDbFooToModel } from "./foo-utils";

// Need to figure out why importing this from the models package is not working.
// Maybe another case of "it should be a compiled package".
export const anonymousFoo: CreateFoo = {
  name: "Anonymous Demo Foo",
  description:
    "This is a demo foo created by an anonymous user to test CDC functionality",
  status: "active" as FooStatus,
  priority: 42,
  is_active: true,
  metadata: {
    source: "anonymous",
    demo: true,
    timestamp: new Date().toISOString(),
  },
  tags: ["demo", "anonymous", "test"],
  score: 50.0,
  large_text:
    "This is some sample large text content for the anonymous demo foo. It demonstrates how the CDC system works when anonymous users create new records.",
};

async function anonymousCreateFoo(): Promise<Foo> {
  const client = await getDrizzleSupabaseAdminClient();

  const result = await client.runTransaction(async (tx) => {
    const insertData: NewDbFoo = {
      ...anonymousFoo,
      score: anonymousFoo.score?.toString() || "0.00",
    };

    const newFoo = await tx.insert(foo).values(insertData).returning();

    return newFoo[0];
  });

  return convertDbFooToModel(result);
}

export function anonymousCreateFooEndpoint(fastify: FastifyInstance) {
  fastify.post<{
    Reply: Foo | { error: string };
  }>("/foo/anonymous-create", async (request, reply) => {
    try {
      const result = await anonymousCreateFoo();
      return reply.status(201).send(result);
    } catch (error) {
      console.error("Anonymous foo creation error:", error);

      return reply
        .status(400)
        .send({ error: "Failed to create foo anonymously" });
    }
  });
}
