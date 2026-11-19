import { createRoute, OpenAPIHono } from "@hono/zod-openapi";

import { getDb } from "../../db/client.js";
import { apiErrorResponses } from "../../shared/errors.js";
import type { AppEnv } from "../../types.js";
import { requireCurrentUser, requireRole } from "../auth/session.js";
import { getDashboardAlerts } from "./service.js";
import { DashboardAlertsResponseSchema } from "./schema.js";

export function registerDashboardAlertRoutes(app: OpenAPIHono<AppEnv>) {
  const route = createRoute({
    method: "get",
    path: "/dashboard/alerts",
    tags: ["dashboard"],
    security: [{ portfolioSession: [] }],
    responses: {
      200: { content: { "application/json": { schema: DashboardAlertsResponseSchema } }, description: "Dashboard customer alerts" },
      ...apiErrorResponses,
    },
  });

  app.openapi(route, async (c) => {
    const db = getDb(c.env);
    const user = await requireCurrentUser(db, c.req.raw, c.env);
    requireRole(user, ["representative"]);
    return c.json(await getDashboardAlerts(db), 200);
  });
}
