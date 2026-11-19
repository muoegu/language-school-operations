import { createRoute, OpenAPIHono } from "@hono/zod-openapi";

import { getDb } from "../../db/client.js";
import { apiErrorResponses } from "../../shared/errors.js";
import type { AppEnv } from "../../types.js";
import { requireCurrentUser, requireRole } from "../auth/session.js";
import { cancelPaymentRecord, createPaymentRecord, getPaymentRecord, listPaymentRecords, updatePaymentRecord } from "./service.js";
import { CreatePaymentRecordSchema, PaymentRecordListQuerySchema, PaymentRecordListSchema, PaymentRecordParamsSchema, PaymentRecordResponseSchema, UpdatePaymentRecordSchema } from "./schema.js";

export function registerPaymentRecordRoutes(app: OpenAPIHono<AppEnv>) {
  const listRoute = createRoute({ method: "get", path: "/payment-records", tags: ["payment-records"], security: [{ portfolioSession: [] }], request: { query: PaymentRecordListQuerySchema }, responses: { 200: { content: { "application/json": { schema: PaymentRecordListSchema } }, description: "Payment record list" }, ...apiErrorResponses } });
  app.openapi(listRoute, async (c) => {
    const db = getDb(c.env);
    const user = await requireCurrentUser(db, c.req.raw, c.env);
    requireRole(user, ["representative"]);
    return c.json(await listPaymentRecords(db, c.req.valid("query")), 200);
  });

  const getRoute = createRoute({ method: "get", path: "/payment-records/{paymentRecordId}", tags: ["payment-records"], security: [{ portfolioSession: [] }], request: { params: PaymentRecordParamsSchema }, responses: { 200: { content: { "application/json": { schema: PaymentRecordResponseSchema } }, description: "Payment record detail" }, ...apiErrorResponses } });
  app.openapi(getRoute, async (c) => {
    const db = getDb(c.env);
    const user = await requireCurrentUser(db, c.req.raw, c.env);
    requireRole(user, ["representative"]);
    return c.json(await getPaymentRecord(db, c.req.valid("param").paymentRecordId), 200);
  });

  const createRouteDefinition = createRoute({ method: "post", path: "/payment-records", tags: ["payment-records"], security: [{ portfolioSession: [] }], request: { body: { content: { "application/json": { schema: CreatePaymentRecordSchema } }, required: true } }, responses: { 201: { content: { "application/json": { schema: PaymentRecordResponseSchema } }, description: "Payment record created" }, ...apiErrorResponses } });
  app.openapi(createRouteDefinition, async (c) => {
    const db = getDb(c.env);
    const user = await requireCurrentUser(db, c.req.raw, c.env);
    requireRole(user, ["representative"]);
    return c.json(await createPaymentRecord(db, c.req.valid("json")), 201);
  });

  const updateRoute = createRoute({ method: "patch", path: "/payment-records/{paymentRecordId}", tags: ["payment-records"], security: [{ portfolioSession: [] }], request: { params: PaymentRecordParamsSchema, body: { content: { "application/json": { schema: UpdatePaymentRecordSchema } }, required: true } }, responses: { 200: { content: { "application/json": { schema: PaymentRecordResponseSchema } }, description: "Payment record updated" }, ...apiErrorResponses } });
  app.openapi(updateRoute, async (c) => {
    const db = getDb(c.env);
    const user = await requireCurrentUser(db, c.req.raw, c.env);
    requireRole(user, ["representative"]);
    return c.json(await updatePaymentRecord(db, c.req.valid("param").paymentRecordId, c.req.valid("json")), 200);
  });

  const deleteRoute = createRoute({ method: "delete", path: "/payment-records/{paymentRecordId}", tags: ["payment-records"], security: [{ portfolioSession: [] }], request: { params: PaymentRecordParamsSchema }, responses: { 204: { description: "Payment record cancelled" }, ...apiErrorResponses } });
  app.openapi(deleteRoute, async (c) => {
    const db = getDb(c.env);
    const user = await requireCurrentUser(db, c.req.raw, c.env);
    requireRole(user, ["representative"]);
    await cancelPaymentRecord(db, c.req.valid("param").paymentRecordId);
    return c.body(null, 204);
  });
}
