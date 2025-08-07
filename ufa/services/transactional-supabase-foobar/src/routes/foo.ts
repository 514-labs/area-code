import { FastifyInstance } from "fastify";
import { getFooAverageScoreEndpoint } from "../foo/get-foo-average-score";
import { getFooScoreOverTimeEndpoint } from "../foo/get-foo-score-over-time";
import { getAllFoosEndpoint } from "../foo/get-all-foos";
import { getFooByIdEndpoint } from "../foo/get-foo-by-id";
import { createFooEndpoint } from "../foo/create-foo";
import { updateFooEndpoint } from "../foo/update-foo";
import { deleteFooEndpoint } from "../foo/delete-foo";
import { bulkDeleteFoosEndpoint } from "../foo/bulk-delete-foos";

export async function fooRoutes(fastify: FastifyInstance) {
  getFooAverageScoreEndpoint(fastify);
  getFooScoreOverTimeEndpoint(fastify);
  getAllFoosEndpoint(fastify);
  getFooByIdEndpoint(fastify);
  createFooEndpoint(fastify);
  updateFooEndpoint(fastify);
  deleteFooEndpoint(fastify);
  bulkDeleteFoosEndpoint(fastify);
}
