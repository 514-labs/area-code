import { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { getDrizzleSupabaseAdminClient } from "../database/connection";
import { bar, type Bar } from "../database/schema";

async function anonymousUpdateBar(id: string): Promise<Bar> {
  // Use admin client (no auth token) to bypass RLS
  const client = await getDrizzleSupabaseAdminClient();

  const result = await client.runTransaction(async (tx) => {
    const currentBar = await tx.select().from(bar).where(eq(bar.id, id));

    if (currentBar.length === 0) {
      throw new Error("Bar not found");
    }

    const existingBar = currentBar[0];
    const newLabel = `${existingBar.label || "Untitled"} (edited)`;

    const updatedBar = await tx
      .update(bar)
      .set({
        label: newLabel,
        updated_at: new Date(),
      })
      .where(eq(bar.id, id))
      .returning();

    return updatedBar[0];
  });

  return result as Bar;
}

export function anonymousUpdateBarEndpoint(fastify: FastifyInstance) {
  fastify.put<{
    Params: { id: string };
    Reply: Bar | { error: string };
  }>("/bar/:id/anonymous-update", async (request, reply) => {
    try {
      const { id } = request.params;
      const result = await anonymousUpdateBar(id);
      return reply.send(result);
    } catch (error) {
      console.error("Anonymous bar update error:", error);

      if (error instanceof Error && error.message === "Bar not found") {
        return reply.status(404).send({ error: error.message });
      }

      return reply
        .status(400)
        .send({ error: "Failed to update bar anonymously" });
    }
  });
}
