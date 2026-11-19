import { createRoute, OpenAPIHono } from "@hono/zod-openapi";

import { getDb } from "../../db/client.js";
import { apiErrorResponses } from "../../shared/errors.js";
import type { AppEnv } from "../../types.js";
import { requireCurrentUser, requireRole } from "../auth/session.js";
import { createTextbook, discontinueTextbook, getTextbook, listTextbooks, updateTextbook } from "./service.js";
import { CreateTextbookSchema, TextbookListQuerySchema, TextbookListSchema, TextbookParamsSchema, TextbookResponseSchema, UpdateTextbookSchema } from "./schema.js";

export function registerTextbookRoutes(app: OpenAPIHono<AppEnv>) {
  const listRoute = createRoute({ method: "get", path: "/textbooks", tags: ["textbooks"], security: [{ portfolioSession: [] }], request: { query: TextbookListQuerySchema }, responses: { 200: { content: { "application/json": { schema: TextbookListSchema } }, description: "Textbook list" }, ...apiErrorResponses } });
  app.openapi(listRoute, async (c) => {
    const db = getDb(c.env);
    const user = await requireCurrentUser(db, c.req.raw, c.env);
    requireRole(user, ["representative", "teacher", "staff"]);
    return c.json(await listTextbooks(db, c.req.valid("query")), 200);
  });

  const getRoute = createRoute({ method: "get", path: "/textbooks/{textbookId}", tags: ["textbooks"], security: [{ portfolioSession: [] }], request: { params: TextbookParamsSchema }, responses: { 200: { content: { "application/json": { schema: TextbookResponseSchema } }, description: "Textbook detail" }, ...apiErrorResponses } });
  app.openapi(getRoute, async (c) => {
    const db = getDb(c.env);
    const user = await requireCurrentUser(db, c.req.raw, c.env);
    requireRole(user, ["representative", "teacher", "staff"]);
    return c.json(await getTextbook(db, c.req.valid("param").textbookId), 200);
  });

  const createRouteDefinition = createRoute({ method: "post", path: "/textbooks", tags: ["textbooks"], security: [{ portfolioSession: [] }], request: { body: { content: { "application/json": { schema: CreateTextbookSchema } }, required: true } }, responses: { 201: { content: { "application/json": { schema: TextbookResponseSchema } }, description: "Textbook created" }, ...apiErrorResponses } });
  app.openapi(createRouteDefinition, async (c) => {
    const db = getDb(c.env);
    const user = await requireCurrentUser(db, c.req.raw, c.env);
    requireRole(user, ["representative"]);
    return c.json(await createTextbook(db, c.req.valid("json")), 201);
  });

  const updateRoute = createRoute({ method: "patch", path: "/textbooks/{textbookId}", tags: ["textbooks"], security: [{ portfolioSession: [] }], request: { params: TextbookParamsSchema, body: { content: { "application/json": { schema: UpdateTextbookSchema } }, required: true } }, responses: { 200: { content: { "application/json": { schema: TextbookResponseSchema } }, description: "Textbook updated" }, ...apiErrorResponses } });
  app.openapi(updateRoute, async (c) => {
    const db = getDb(c.env);
    const user = await requireCurrentUser(db, c.req.raw, c.env);
    requireRole(user, ["representative"]);
    return c.json(await updateTextbook(db, c.req.valid("param").textbookId, c.req.valid("json")), 200);
  });

  const deleteRoute = createRoute({ method: "delete", path: "/textbooks/{textbookId}", tags: ["textbooks"], security: [{ portfolioSession: [] }], request: { params: TextbookParamsSchema }, responses: { 204: { description: "Textbook discontinued" }, ...apiErrorResponses } });
  app.openapi(deleteRoute, async (c) => {
    const db = getDb(c.env);
    const user = await requireCurrentUser(db, c.req.raw, c.env);
    requireRole(user, ["representative"]);
    await discontinueTextbook(db, c.req.valid("param").textbookId);
    return c.body(null, 204);
  });
}
