import { IncomingMessage, ServerResponse } from "http";
import { getEnforceAuth } from "../src/env-vars";
import { getAdminClient, getRlsClient } from "../src/database/connection";
import { foo, bar } from "../src/database/schema";
import { and, eq, desc } from "drizzle-orm";

type NodeReq = IncomingMessage;
type NodeRes = ServerResponse;

function getAllowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS || "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function setCors(res: NodeRes, origin?: string) {
  const allowed = getAllowedOrigins();
  const isDev = process.env.NODE_ENV !== "production";
  const allow = isDev && allowed.length === 0 ? "*" : allowed.includes(origin || "") ? origin : "";
  if (allow) res.setHeader("Access-Control-Allow-Origin", allow);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function notFound(res: NodeRes) {
  res.statusCode = 404;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ error: "Not Found" }));
}

function badRequest(res: NodeRes, message: string) {
  res.statusCode = 400;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ error: message }));
}

async function parseBody(req: NodeReq): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk: Buffer) => (data += chunk.toString("utf8")));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function getAuthToken(req: NodeReq): string | undefined {
  const h = req.headers?.authorization || req.headers?.Authorization;
  if (!h || typeof h !== "string") return undefined;
  const parts = h.split(" ");
  if (parts.length === 2 && /^Bearer$/i.test(parts[0])) return parts[1];
  return undefined;
}

export default async function handler(req: NodeReq, res: NodeRes) {
  try {
    const origin = req.headers?.origin as string | undefined;
    setCors(res, origin);
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }

    // Health
    if (req.method === "GET" && req.url?.match(/\/api\/?health$/)) {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    const path = url.pathname.replace(/^.*\/api\/?/, "/");
    const segments = path.split("/").filter(Boolean);
    const token = getAuthToken(req);
    const client = getEnforceAuth() ? await getRlsClient(token) : await getAdminClient();

    // /foo collection
    if (segments[0] === "foo" && segments.length === 1) {
      if (req.method === "GET") {
        const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "50", 10), 1), 200);
        const offset = Math.max(parseInt(url.searchParams.get("offset") || "0", 10), 0);
        const rows = await client.runTransaction(async (tx) => {
          return await tx.select().from(foo).orderBy(desc(foo.created_at)).limit(limit).offset(offset);
        });
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ items: rows, limit, offset }));
        return;
      }
      if (req.method === "POST") {
        const body = await parseBody(req);
        if (!body?.name) return badRequest(res, "name is required");
        const created = await client.runTransaction(async (tx) => {
          const result = await tx.insert(foo).values({
            name: String(body.name),
            description: body.description ?? null,
            status: body.status ?? "active",
            priority: body.priority ?? 1,
            is_active: body.is_active ?? true,
            metadata: body.metadata ?? {},
            tags: Array.isArray(body.tags) ? body.tags : [],
            score: body.score ?? "0.00",
            large_text: body.large_text ?? "",
          }).returning();
          return result[0];
        });
        res.setHeader("content-type", "application/json");
        res.statusCode = 201;
        res.end(JSON.stringify(created));
        return;
      }
    }

    // /foo/:id item
    if (segments[0] === "foo" && segments.length === 2) {
      const id = segments[1];
      if (req.method === "GET") {
        const row = await client.runTransaction(async (tx) => {
          const result = await tx.select().from(foo).where(eq(foo.id, id)).limit(1);
          return result[0] || null;
        });
        if (!row) return notFound(res);
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify(row));
        return;
      }
      if (req.method === "PATCH") {
        const body = await parseBody(req);
        const updated = await client.runTransaction(async (tx) => {
          const result = await tx
            .update(foo)
            .set({
              name: body.name,
              description: body.description,
              status: body.status,
              priority: body.priority,
              is_active: body.is_active,
              metadata: body.metadata,
              tags: Array.isArray(body.tags) ? body.tags : undefined,
              score: body.score,
              large_text: body.large_text,
              updated_at: new Date(),
            })
            .where(eq(foo.id, id))
            .returning();
          return result[0] || null;
        });
        if (!updated) return notFound(res);
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify(updated));
        return;
      }
      if (req.method === "DELETE") {
        const deleted = await client.runTransaction(async (tx) => {
          const result = await tx.delete(foo).where(eq(foo.id, id)).returning();
          return result[0] || null;
        });
        if (!deleted) return notFound(res);
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ ok: true }));
        return;
      }
    }

    // /bar collection
    if (segments[0] === "bar" && segments.length === 1) {
      if (req.method === "GET") {
        const fooId = url.searchParams.get("fooId");
        const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "50", 10), 1), 200);
        const offset = Math.max(parseInt(url.searchParams.get("offset") || "0", 10), 0);
        const rows = await client.runTransaction(async (tx) => {
          const baseQuery = tx.select().from(bar).orderBy(desc(bar.created_at)).limit(limit).offset(offset);
          if (fooId) {
            return await baseQuery.where(eq(bar.foo_id, fooId));
          } else {
            return await baseQuery;
          }
        });
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ items: rows, limit, offset }));
        return;
      }
      if (req.method === "POST") {
        const body = await parseBody(req);
        if (!body?.foo_id) return badRequest(res, "foo_id is required");
        if (typeof body.value !== "number") return badRequest(res, "value is required and must be number");
        const created = await client.runTransaction(async (tx) => {
          const result = await tx.insert(bar).values({
            foo_id: String(body.foo_id),
            value: body.value,
            label: body.label ?? null,
            notes: body.notes ?? null,
            is_enabled: body.is_enabled ?? true,
          }).returning();
          return result[0];
        });
        res.setHeader("content-type", "application/json");
        res.statusCode = 201;
        res.end(JSON.stringify(created));
        return;
      }
    }

    // /bar/:id item
    if (segments[0] === "bar" && segments.length === 2) {
      const id = segments[1];
      if (req.method === "GET") {
        const row = await client.runTransaction(async (tx) => {
          const result = await tx.select().from(bar).where(eq(bar.id, id)).limit(1);
          return result[0] || null;
        });
        if (!row) return notFound(res);
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify(row));
        return;
      }
      if (req.method === "PATCH") {
        const body = await parseBody(req);
        const updated = await client.runTransaction(async (tx) => {
          const result = await tx
            .update(bar)
            .set({
              foo_id: body.foo_id,
              value: body.value,
              label: body.label,
              notes: body.notes,
              is_enabled: body.is_enabled,
              updated_at: new Date(),
            })
            .where(eq(bar.id, id))
            .returning();
          return result[0] || null;
        });
        if (!updated) return notFound(res);
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify(updated));
        return;
      }
      if (req.method === "DELETE") {
        const deleted = await client.runTransaction(async (tx) => {
          const result = await tx.delete(bar).where(eq(bar.id, id)).returning();
          return result[0] || null;
        });
        if (!deleted) return notFound(res);
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ ok: true }));
        return;
      }
    }

    notFound(res);
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: "Internal Server Error", message: err?.message }));
  }
}


