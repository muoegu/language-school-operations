import { createRoute, OpenAPIHono } from "@hono/zod-openapi";

import { getDb } from "../../db/client.js";
import { apiErrorResponses } from "../../shared/errors.js";
import type { AppEnv } from "../../types.js";
import { canManageSchedule, canViewAllRecords, canViewAllSchedule, requireCurrentUser } from "../auth/session.js";
import {
  CreateLessonResponseSchema,
  CreateLessonSchema,
  CalendarLessonListSchema,
  CalendarLessonQuerySchema,
  LessonListSchema,
  LessonParamsSchema,
  LessonQuerySchema,
  LessonResponseSchema,
  UpdateLessonSchema,
} from "./schema.js";
import {
  cancelLesson,
  createLesson,
  getLesson,
  listCalendarLessons,
  listLessons,
  updateLesson,
} from "./service.js";

export function registerLessonRoutes(app: OpenAPIHono<AppEnv>) {
  const calendarRoute = createRoute({
    method: "get",
    path: "/calendar/lessons",
    tags: ["calendar"],
    security: [{ portfolioSession: [] }],
    request: { query: CalendarLessonQuerySchema },
    responses: {
      200: {
        content: { "application/json": { schema: CalendarLessonListSchema } },
        description: "Lessons for a calendar period",
      },
      ...apiErrorResponses,
    },
  });

  app.openapi(calendarRoute, async (c) => {
    const db = getDb(c.env);
    const user = await requireCurrentUser(db, c.req.raw, c.env);
    const result = await listCalendarLessons(db, c.req.valid("query"), {
      teacherId: user.teacherId ?? undefined,
      canViewAll: canViewAllSchedule(user.role),
      canViewRecords: canViewAllRecords(user.role) || user.role === "teacher",
      canManageSchedule: canManageSchedule(user.role),
    });
    return c.json(result, 200);
  });

  const listRoute = createRoute({
    method: "get",
    path: "/lessons",
    tags: ["lessons"],
    security: [{ portfolioSession: [] }],
    request: { query: LessonQuerySchema },
    responses: {
      200: {
        content: { "application/json": { schema: LessonListSchema } },
        description: "Lesson list",
      },
      ...apiErrorResponses,
    },
  });

  app.openapi(listRoute, async (c) => {
    const db = getDb(c.env);
    const user = await requireCurrentUser(db, c.req.raw, c.env);
    const result = await listLessons(db, c.req.valid("query"), {
      teacherId: user.teacherId ?? undefined,
      canViewAll: canViewAllSchedule(user.role),
      canViewRecords: canViewAllRecords(user.role) || user.role === "teacher",
      canManageSchedule: canManageSchedule(user.role),
    });
    return c.json(result, 200);
  });

  const createRouteDefinition = createRoute({
    method: "post",
    path: "/lessons",
    tags: ["lessons"],
    security: [{ portfolioSession: [] }],
    request: {
      body: {
        content: { "application/json": { schema: CreateLessonSchema } },
        required: true,
      },
    },
    responses: {
      201: {
        content: { "application/json": { schema: CreateLessonResponseSchema } },
        description: "Lesson created",
      },
      ...apiErrorResponses,
    },
  });

  app.openapi(createRouteDefinition, async (c) => {
    const db = getDb(c.env);
    const user = await requireCurrentUser(db, c.req.raw, c.env);
    const result = await createLesson(db, c.req.valid("json"), {
      teacherId: user.teacherId ?? undefined,
      canViewAll: canViewAllSchedule(user.role),
      canViewRecords: canViewAllRecords(user.role) || user.role === "teacher",
      canManageSchedule: canManageSchedule(user.role),
    });
    return c.json(result, 201);
  });

  const getRoute = createRoute({
    method: "get",
    path: "/lessons/{lessonId}",
    tags: ["lessons"],
    security: [{ portfolioSession: [] }],
    request: { params: LessonParamsSchema },
    responses: {
      200: {
        content: { "application/json": { schema: LessonResponseSchema } },
        description: "Lesson detail",
      },
      ...apiErrorResponses,
    },
  });

  app.openapi(getRoute, async (c) => {
    const db = getDb(c.env);
    const user = await requireCurrentUser(db, c.req.raw, c.env);
    const result = await getLesson(db, c.req.valid("param").lessonId, {
      teacherId: user.teacherId ?? undefined,
      canViewAll: canViewAllSchedule(user.role),
      canViewRecords: canViewAllRecords(user.role) || user.role === "teacher",
      canManageSchedule: canManageSchedule(user.role),
    });
    return c.json(result, 200);
  });

  const updateRoute = createRoute({
    method: "patch",
    path: "/lessons/{lessonId}",
    tags: ["lessons"],
    security: [{ portfolioSession: [] }],
    request: {
      params: LessonParamsSchema,
      body: {
        content: { "application/json": { schema: UpdateLessonSchema } },
        required: true,
      },
    },
    responses: {
      200: {
        content: { "application/json": { schema: LessonResponseSchema } },
        description: "Lesson updated",
      },
      ...apiErrorResponses,
    },
  });

  app.openapi(updateRoute, async (c) => {
    const db = getDb(c.env);
    const user = await requireCurrentUser(db, c.req.raw, c.env);
    const result = await updateLesson(
      db,
      c.req.valid("param").lessonId,
      c.req.valid("json"),
      {
        teacherId: user.teacherId ?? undefined,
        canViewAll: canViewAllSchedule(user.role),
        canViewRecords: canViewAllRecords(user.role) || user.role === "teacher",
        canManageSchedule: canManageSchedule(user.role),
      },
    );
    return c.json(result, 200);
  });

  const deleteRoute = createRoute({
    method: "delete",
    path: "/lessons/{lessonId}",
    tags: ["lessons"],
    security: [{ portfolioSession: [] }],
    request: { params: LessonParamsSchema },
    responses: { 204: { description: "Lesson cancelled" }, ...apiErrorResponses },
  });

  app.openapi(deleteRoute, async (c) => {
    const db = getDb(c.env);
    const user = await requireCurrentUser(db, c.req.raw, c.env);
    await cancelLesson(db, c.req.valid("param").lessonId, {
      teacherId: user.teacherId ?? undefined,
      canViewAll: canViewAllSchedule(user.role),
      canViewRecords: canViewAllRecords(user.role) || user.role === "teacher",
      canManageSchedule: canManageSchedule(user.role),
    });
    return c.body(null, 204);
  });
}
