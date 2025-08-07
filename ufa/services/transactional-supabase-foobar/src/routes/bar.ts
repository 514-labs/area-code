import { FastifyInstance } from "fastify";
import { getBarAverageValueEndpoint } from "../bar/get-bar-average-value";
import { getAllBarsEndpoint } from "../bar/get-all-bars";
import { getBarByIdEndpoint } from "../bar/get-bar-by-id";
import { createBarEndpoint } from "../bar/create-bar";

export async function barRoutes(fastify: FastifyInstance) {
  getBarAverageValueEndpoint(fastify);
  getAllBarsEndpoint(fastify);
  getBarByIdEndpoint(fastify);
  createBarEndpoint(fastify);

  // TODO: Convert remaining endpoints
}
