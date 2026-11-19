import { createRoute, OpenAPIHono } from "@hono/zod-openapi";

import { getDb } from "../../db/client.js";
import { apiErrorResponses } from "../../shared/errors.js";
import type { AppEnv } from "../../types.js";
import { requireCurrentUser, requireRole } from "../auth/session.js";
import { createLessonType, deactivateLessonType, getLessonType, listLessonTypes, updateLessonType } from "./service.js";
import { CreateLessonTypeSchema, LessonTypeListQuerySchema, LessonTypeListSchema, LessonTypeParamsSchema, LessonTypeResponseSchema, UpdateLessonTypeSchema } from "./schema.js";

export function registerLessonTypeRoutes(app: OpenAPIHono<AppEnv>) {
  const listRoute = createRoute({ method: "get", path: "/classes", tags: ["classes"], security: [{ portfolioSession: [] }], request: { query: LessonTypeListQuerySchema }, responses: { 200: { content: { "application/json": { schema: LessonTypeListSchema } }, description: "Class list" }, ...apiErrorResponses } });
  app.openapi(listRoute, async (c) => {
    const db = getDb(c.env);
    const user = await requireCurrentUser(db, c.req.raw, c.env);
    requireRole(user, ["representative", "teacher", "staff"]);
    return c.json(await listLessonTypes(db, c.req.valid("query")), 200);
  });

  const getRoute = createRoute({ method: "get", path: "/classes/{classId}", tags: ["classes"], security: [{ portfolioSession: [] }], request: { params: LessonTypeParamsSchema }, responses: { 200: { content: { "application/json": { schema: LessonTypeResponseSchema } }, description: "Class detail" }, ...apiErrorResponses } });
  app.openapi(getRoute, async (c) => {
    const db = getDb(c.env);
    const user = await requireCurrentUser(db, c.req.raw, c.env);
    requireRole(user, ["representative", "teacher", "staff"]);
    return c.json(await getLessonType(db, c.req.valid("param").classId), 200);
  });

  const createRouteDefinition = createRoute({ method: "post", path: "/classes", tags: ["classes"], security: [{ portfolioSession: [] }], request: { body: { content: { "application/json": { schema: CreateLessonTypeSchema } }, required: true } }, responses: { 201: { content: { "application/json": { schema: LessonTypeResponseSchema } }, description: "Class created" }, ...apiErrorResponses } });
  app.openapi(createRouteDefinition, async (c) => {
    const db = getDb(c.env);
    const user = await requireCurrentUser(db, c.req.raw, c.env);
    requireRole(user, ["representative"]);
    return c.json(await createLessonType(db, c.req.valid("json")), 201);
  });

  const updateRoute = createRoute({ method: "patch", path: "/classes/{classId}", tags: ["classes"], security: [{ portfolioSession: [] }], request: { params: LessonTypeParamsSchema, body: { content: { "application/json": { schema: UpdateLessonTypeSchema } }, required: true } }, responses: { 200: { content: { "application/json": { schema: LessonTypeResponseSchema } }, description: "Class updated" }, ...apiErrorResponses } });
  app.openapi(updateRoute, async (c) => {
    const db = getDb(c.env);
    const user = await requireCurrentUser(db, c.req.raw, c.env);
    requireRole(user, ["representative"]);
    return c.json(await updateLessonType(db, c.req.valid("param").classId, c.req.valid("json")), 200);
  });

  const deleteRoute = createRoute({ method: "delete", path: "/classes/{classId}", tags: ["classes"], security: [{ portfolioSession: [] }], request: { params: LessonTypeParamsSchema }, responses: { 204: { description: "Class deactivated" }, ...apiErrorResponses } });
  app.openapi(deleteRoute, async (c) => {
    const db = getDb(c.env);
    const user = await requireCurrentUser(db, c.req.raw, c.env);
    requireRole(user, ["representative"]);
    await deactivateLessonType(db, c.req.valid("param").classId);
    return c.body(null, 204);
  });
}
