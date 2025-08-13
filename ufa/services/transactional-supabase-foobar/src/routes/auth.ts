import { FastifyInstance } from "fastify";
import { checkAdminStatusEndpoint } from "../auth/check-admin-status";

export async function authRoutes(fastify: FastifyInstance) {
  checkAdminStatusEndpoint(fastify);
}
