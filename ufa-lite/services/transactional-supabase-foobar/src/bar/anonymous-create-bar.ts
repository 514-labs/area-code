import { FastifyInstance } from "fastify";
import { getDrizzleSupabaseAdminClient } from "../database/connection";
import { bar, foo, type Bar, type NewDbBar } from "../database/schema";
import type { CreateBar } from "@workspace/models";

// Define anonymous bar data locally to avoid import issues
const anonymousBarData: CreateBar = {
  foo_id: "demo-foo-id", // Will be set to an actual foo ID at runtime
  value: 100,
  label: "Anonymous Demo Bar",
  notes:
    "This is a demo bar created by an anonymous user to test CDC functionality",
  is_enabled: true,
};

async function anonymousCreateBar(): Promise<Bar> {
  // Use admin client (no auth token) to bypass RLS
  const client = await getDrizzleSupabaseAdminClient();

  const result = await client.runTransaction(async (tx) => {
    // First, find any existing foo to use as foo_id
    const existingFoos = await tx.select({ id: foo.id }).from(foo).limit(1);

    if (existingFoos.length === 0) {
      throw new Error("No foos available to associate with anonymous bar");
    }

    const insertData: NewDbBar = {
      foo_id: existingFoos[0].id, // Use the first available foo
      value: anonymousBarData.value,
      label: anonymousBarData.label,
      notes: anonymousBarData.notes,
      is_enabled: anonymousBarData.is_enabled ?? true,
    };

    const newBar = await tx.insert(bar).values(insertData).returning();

    return newBar[0];
  });

  return result;
}

export function anonymousCreateBarEndpoint(fastify: FastifyInstance) {
  fastify.post<{
    Reply: Bar | { error: string };
  }>("/bar/anonymous-create", async (request, reply) => {
    try {
      const result = await anonymousCreateBar();
      return reply.status(201).send(result);
    } catch (error) {
      console.error("Anonymous bar creation error:", error);

      return reply
        .status(400)
        .send({ error: "Failed to create bar anonymously" });
    }
  });
}
