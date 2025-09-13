import { defineConfig } from "@kubb/core";
import { pluginOas } from "@kubb/plugin-oas";
import { pluginTs } from "@kubb/plugin-ts";
import { pluginClient } from "@kubb/plugin-client";

export default defineConfig({
  input: {
    path: "./.moose/openapi.yaml", // Moose generates this when running
  },
  output: {
    path: "../../apps/web-frontend-foobar/src/analytical-api-client",
  },
  plugins: [
    pluginOas({
      output: {
        path: "schemas",
      },
      validate: true,
    }),
    pluginTs({
      output: {
        path: "types",
      },
    }),
    pluginClient({
      output: {
        path: "client",
      },
      client: "fetch",
    }),
  ],
});
