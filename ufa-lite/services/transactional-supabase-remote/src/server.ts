import Fastify from "fastify";
import { getNodeEnv } from "./env-vars";

export function buildServer() {
  const app = Fastify({ logger: getNodeEnv() === "development" });
  app.get("/health", async () => ({ ok: true }));
  return app;
}

if (process.env.VERCEL === undefined) {
  const app = buildServer();
  const port = Number(process.env.PORT || 8082);
  app.listen({ port, host: "0.0.0.0" }).catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
}


