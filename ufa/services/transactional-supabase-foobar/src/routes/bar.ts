import { FastifyInstance } from "fastify";
import { getBarAverageValueEndpoint } from "../bar/get-bar-average-value";
import { getAllBarsEndpoint } from "../bar/get-all-bars";
import { getBarByIdEndpoint } from "../bar/get-bar-by-id";
import { createBarEndpoint } from "../bar/create-bar";
import { updateBarEndpoint } from "../bar/update-bar";
import { deleteBarEndpoint } from "../bar/delete-bar";
import { bulkDeleteBarsEndpoint } from "../bar/bulk-delete-bars";

export async function barRoutes(fastify: FastifyInstance) {
  getBarAverageValueEndpoint(fastify);
  getAllBarsEndpoint(fastify);
  getBarByIdEndpoint(fastify);
  createBarEndpoint(fastify);
  updateBarEndpoint(fastify);
  deleteBarEndpoint(fastify);
  bulkDeleteBarsEndpoint(fastify);
}
