import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { searchFoos, searchBars, searchAll } from "../services/search";

// Validation schemas
const searchQuerySchema = z.object({
  q: z.string().optional().default(""),
  from: z.coerce.number().int().min(0).optional().default(0),
  size: z.coerce.number().int().min(1).max(100).optional().default(10),
  // Filters for foos
  status: z.string().optional(),
  priority: z.coerce.number().optional(),
  isActive: z.coerce.boolean().optional(),
  // Filters for bars
  fooId: z.string().optional(),
  isEnabled: z.coerce.boolean().optional(),
  // Sorting
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const searchRoutes: FastifyPluginAsync = async (fastify) => {
  // Search foos
  fastify.get(
    "/search/foos",
    {
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              hits: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    _id: { type: "string" },
                    _score: { type: ["number", "null"] },
                    _source: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        description: { type: ["string", "null"] },
                        status: { type: "string" },
                        priority: { type: "number" },
                        isActive: { type: "boolean" },
                        createdAt: { type: "string" },
                        updatedAt: { type: "string" },
                      },
                    },
                  },
                },
              },
              total: {
                type: "object",
                properties: {
                  value: { type: "number" },
                  relation: { type: "string" },
                },
              },
              took: { type: "number" },
            },
          },
        },
      },
    },
    async (request) => {
      const query = searchQuerySchema.parse(request.query);

      const filters: Record<string, any> = {};
      if (query.status) filters.status = query.status;
      if (query.priority !== undefined) filters.priority = query.priority;
      if (query.isActive !== undefined) filters.isActive = query.isActive;

      const sort = query.sortBy
        ? [{ [query.sortBy]: query.sortOrder }]
        : [{ _score: "desc" }];

      const result = await searchFoos({
        query: query.q,
        filters,
        from: query.from,
        size: query.size,
        sort,
      });

      return result;
    }
  );

  // Search bars
  fastify.get(
    "/search/bars",
    {
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              hits: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    _id: { type: "string" },
                    _score: { type: ["number", "null"] },
                    _source: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        fooId: { type: "string" },
                        value: { type: "number" },
                        label: { type: ["string", "null"] },
                        notes: { type: ["string", "null"] },
                        isEnabled: { type: "boolean" },
                        createdAt: { type: "string" },
                        updatedAt: { type: "string" },
                      },
                    },
                  },
                },
              },
              total: {
                type: "object",
                properties: {
                  value: { type: "number" },
                  relation: { type: "string" },
                },
              },
              took: { type: "number" },
            },
          },
        },
      },
    },
    async (request) => {
      const query = searchQuerySchema.parse(request.query);

      const filters: Record<string, any> = {};
      if (query.fooId) filters.fooId = query.fooId;
      if (query.isEnabled !== undefined) filters.isEnabled = query.isEnabled;

      const sort = query.sortBy
        ? [{ [query.sortBy]: query.sortOrder }]
        : [{ _score: "desc" }];

      const result = await searchBars({
        query: query.q,
        filters,
        from: query.from,
        size: query.size,
        sort,
      });

      return result;
    }
  );

  // Search all (both foos and bars)
  fastify.get(
    "/search",
    {
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              foos: {
                type: "object",
                properties: {
                  hits: { type: "array" },
                  total: { type: "object" },
                  took: { type: "number" },
                },
              },
              bars: {
                type: "object",
                properties: {
                  hits: { type: "array" },
                  total: { type: "object" },
                  took: { type: "number" },
                },
              },
            },
          },
        },
      },
    },
    async (request) => {
      const query = searchQuerySchema.parse(request.query);

      const fooFilters: Record<string, any> = {};
      if (query.status) fooFilters.status = query.status;
      if (query.priority !== undefined) fooFilters.priority = query.priority;
      if (query.isActive !== undefined) fooFilters.isActive = query.isActive;

      const barFilters: Record<string, any> = {};
      if (query.fooId) barFilters.fooId = query.fooId;
      if (query.isEnabled !== undefined) barFilters.isEnabled = query.isEnabled;

      const sort = query.sortBy
        ? [{ [query.sortBy]: query.sortOrder }]
        : [{ _score: "desc" }];

      const result = await searchAll({
        query: query.q,
        filters: { ...fooFilters, ...barFilters },
        from: query.from,
        size: query.size,
        sort,
      });

      return result;
    }
  );
};
