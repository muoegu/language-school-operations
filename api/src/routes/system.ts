import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { sql } from "drizzle-orm";

import { getDb } from "../db/client.js";
import type { AppEnv } from "../types.js";

export function registerSystemRoutes(app: OpenAPIHono<AppEnv>) {
  const healthRoute = createRoute({
    method: "get",
    path: "/healthz",
    tags: ["system"],
    responses: {
      200: {
        content: {
          "application/json": {
            schema: z.object({ status: z.literal("ok") }).openapi("HealthResponse"),
          },
        },
        description: "API is running",
      },
    },
  });

  app.openapi(healthRoute, (c) => {
    c.header("Cache-Control", "no-store");
    return c.json({ status: "ok" });
  });

  const readyRoute = createRoute({
    method: "get",
    path: "/readyz",
    tags: ["system"],
    responses: {
      200: {
        content: {
          "application/json": {
            schema: z.object({ status: z.literal("ready") }).openapi("ReadyResponse"),
          },
        },
        description: "API and database are ready",
      },
      503: {
        content: {
          "application/json": {
            schema: z.object({
              status: z.literal("not_ready"),
              checks: z.object({ database: z.enum(["ok", "error"]), sessionSecret: z.enum(["ok", "missing"]) }),
            }).openapi("NotReadyResponse"),
          },
        },
        description: "A required dependency or secret is not ready",
      },
    },
  });

  app.openapi(readyRoute, async (c) => {
    c.header("Cache-Control", "no-store");
    let database: "ok" | "error" = "ok";
    try {
      await getDb(c.env).execute(sql`select 1`);
    } catch {
      database = "error";
    }
    const sessionSecret: "ok" | "missing" = c.env.NODE_ENV === "production" && !c.env.DEMO_SESSION_SECRET ? "missing" : "ok";
    if (database === "error" || sessionSecret === "missing") {
      c.header("Retry-After", "5");
      return c.json({ status: "not_ready", checks: { database, sessionSecret } }, 503);
    }
    return c.json({ status: "ready" }, 200);
  });
}
