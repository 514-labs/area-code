import { FastifyInstance } from "fastify";
import { getDrizzleSupabaseClient } from "../database/connection";
import { users } from "../database/schema";
import { getEnforceAuth } from "../env-vars";

export interface AdminStatusResponse {
  isAdmin: boolean;
}

async function checkAdminStatus(
  authToken?: string
): Promise<AdminStatusResponse> {
  const enforceAuth = getEnforceAuth();

  if (!enforceAuth) {
    return {
      isAdmin: true,
    };
  }

  if (!authToken) {
    return {
      isAdmin: false,
    };
  }

  try {
    const client = await getDrizzleSupabaseClient(authToken);

    const userResult = await client.runTransaction(async (tx) => {
      return await tx.select({ role: users.role }).from(users).limit(1);
    });

    const isAdmin = userResult.length > 0 && userResult[0].role === "admin";

    return {
      isAdmin,
    };
  } catch (error) {
    console.error("Error checking admin status:", error);
    return {
      isAdmin: false,
    };
  }
}

export function checkAdminStatusEndpoint(fastify: FastifyInstance) {
  fastify.get<{
    Reply: AdminStatusResponse | { error: string };
  }>("/auth/admin-status", async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      const authToken = authHeader?.startsWith("Bearer ")
        ? authHeader.substring(7)
        : undefined;

      const result = await checkAdminStatus(authToken);
      return reply.status(200).send(result);
    } catch (error) {
      console.error("Admin status check error:", error);

      return reply.status(500).send({
        error: "Failed to check admin status",
      });
    }
  });
}
