import { defineConfig } from "orval";

export default defineConfig({
  // Consumption APIs with React Query + Zod
  analytics: {
    input: {
      target: "./.moose/openapi.yaml",
      filters: {
        mode: "include",
        tags: ["consumption"],
      },
    },
    output: {
      mode: "tags-split",
      target: "../../packages/analytics-sdk/src/gen/endpoints",
      schemas: "../../packages/analytics-sdk/src/gen/models",
      client: "react-query",
      httpClient: "fetch",
    },
    hooks: {
      afterAllFilesWrite: "prettier --write",
    },
  },
  analyticsZod: {
    input: "./.moose/openapi.yaml",
    output: {
      target: "../../packages/analytics-sdk/src/gen/endpoints",
      fileExtension: ".zod.ts",
      client: "zod",
    },
  },
  //   // Ingest APIs with TypeScript fetch + Zod
  //   ingest: {
  //     input: "./.moose/openapi.yaml",
  //     output: {
  //       target: "../../packages/ingest-sdk/src/generated.ts",
  //       client: "zod",
  //     },
  //     hooks: {
  //       afterAllFilesWrite: "prettier --write",
  //     },
  //   },
});
