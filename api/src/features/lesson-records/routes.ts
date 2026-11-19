import { createRoute, OpenAPIHono } from "@hono/zod-openapi";

import { getDb } from "../../db/client.js";
import { apiErrorResponses } from "../../shared/errors.js";
import type { AppEnv } from "../../types.js";
import { canManageSchedule, canViewAllRecords, canViewAllSchedule, requireCurrentUser } from "../auth/session.js";
import { LessonParamsSchema } from "../lessons/schema.js";
import {
  CreateLessonRecordSchema,
  LessonRecordResponseSchema,
  UpdateLessonRecordSchema,
} from "./schema.js";
import {
  createLessonRecord,
  deleteLessonRecord,
  getLessonRecord,
  updateLessonRecord,
} from "./service.js";

function viewerOf(user: { id: string; teacherId: string | null; role: string }) {
  return {
    userId: user.id,
    teacherId: user.teacherId ?? undefined,
    canViewAll: canViewAllSchedule(user.role),
    canViewRecords: canViewAllRecords(user.role) || user.role === "teacher",
    canManageLessonRecords: canViewAllRecords(user.role) || user.role === "teacher",
    canManageSchedule: canManageSchedule(user.role),
  };
}

export function registerLessonRecordRoutes(app: OpenAPIHono<AppEnv>) {
  const getRoute = createRoute({
    method: "get", path: "/lessons/{lessonId}/record", tags: ["lesson-records"], security: [{ portfolioSession: [] }],
    request: { params: LessonParamsSchema },
    responses: { 200: { content: { "application/json": { schema: LessonRecordResponseSchema } }, description: "Lesson record" }, ...apiErrorResponses },
  });
  app.openapi(getRoute, async (c) => {
    const db = getDb(c.env);
    const user = await requireCurrentUser(db, c.req.raw, c.env);
    return c.json(await getLessonRecord(db, c.req.valid("param").lessonId, viewerOf(user)), 200);
  });

  const createRouteDefinition = createRoute({
    method: "post", path: "/lessons/{lessonId}/record", tags: ["lesson-records"], security: [{ portfolioSession: [] }],
    request: {
      params: LessonParamsSchema,
      body: { content: { "application/json": { schema: CreateLessonRecordSchema } }, required: true },
    },
    responses: { 201: { content: { "application/json": { schema: LessonRecordResponseSchema } }, description: "Lesson record created" }, ...apiErrorResponses },
  });
  app.openapi(createRouteDefinition, async (c) => {
    const db = getDb(c.env);
    const user = await requireCurrentUser(db, c.req.raw, c.env);
    const result = await createLessonRecord(db, c.req.valid("param").lessonId, c.req.valid("json"), viewerOf(user));
    return c.json(result, 201);
  });

  const updateRoute = createRoute({
    method: "patch", path: "/lessons/{lessonId}/record", tags: ["lesson-records"], security: [{ portfolioSession: [] }],
    request: {
      params: LessonParamsSchema,
      body: { content: { "application/json": { schema: UpdateLessonRecordSchema } }, required: true },
    },
    responses: { 200: { content: { "application/json": { schema: LessonRecordResponseSchema } }, description: "Lesson record updated" }, ...apiErrorResponses },
  });
  app.openapi(updateRoute, async (c) => {
    const db = getDb(c.env);
    const user = await requireCurrentUser(db, c.req.raw, c.env);
    const result = await updateLessonRecord(db, c.req.valid("param").lessonId, c.req.valid("json"), viewerOf(user));
    return c.json(result, 200);
  });

  const deleteRoute = createRoute({
    method: "delete", path: "/lessons/{lessonId}/record", tags: ["lesson-records"], security: [{ portfolioSession: [] }],
    request: { params: LessonParamsSchema },
    responses: { 204: { description: "Lesson record deleted" }, ...apiErrorResponses },
  });
  app.openapi(deleteRoute, async (c) => {
    const db = getDb(c.env);
    const user = await requireCurrentUser(db, c.req.raw, c.env);
    await deleteLessonRecord(db, c.req.valid("param").lessonId, viewerOf(user));
    return c.body(null, 204);
  });
}
