import { createRoute, OpenAPIHono } from "@hono/zod-openapi";

import { getDb } from "../../db/client.js";
import { apiErrorResponses } from "../../shared/errors.js";
import type { AppEnv } from "../../types.js";
import { requireCurrentUser, requireRole } from "../auth/session.js";
import { PaymentReportQuerySchema, PaymentReportResponseSchema } from "./schema.js";
import { getPaymentReport } from "./service.js";

export function registerPaymentReportRoutes(app: OpenAPIHono<AppEnv>) {
  const route = createRoute({
    method: "get",
    path: "/reports/payment-records",
    tags: ["payment-reports"],
    security: [{ portfolioSession: [] }],
    request: { query: PaymentReportQuerySchema },
    responses: { 200: { content: { "application/json": { schema: PaymentReportResponseSchema } }, description: "Payment records report" }, ...apiErrorResponses },
  });

  app.openapi(route, async (c) => {
    const db = getDb(c.env);
    const user = await requireCurrentUser(db, c.req.raw, c.env);
    requireRole(user, ["representative"]);
    return c.json(await getPaymentReport(db, c.req.valid("query")), 200);
  });
}
