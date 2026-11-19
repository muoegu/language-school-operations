import { createRoute, OpenAPIHono } from "@hono/zod-openapi";

import { getDb } from "../../db/client.js";
import { apiErrorResponses } from "../../shared/errors.js";
import type { AppEnv } from "../../types.js";
import { requireCurrentUser, requireRole } from "../auth/session.js";
import {
  CreateTeacherSchema,
  TeacherListQuerySchema,
  TeacherListSchema,
  TeacherParamsSchema,
  TeacherResponseSchema,
  UpdateTeacherSchema,
} from "./schema.js";
import {
  createTeacher,
  deactivateTeacher,
  getTeacher,
  listTeachers,
  updateTeacher,
} from "./service.js";

export function registerTeacherRoutes(app: OpenAPIHono<AppEnv>) {
  const listRoute = createRoute({
    method: "get",
    path: "/teachers",
    tags: ["teachers"],
    security: [{ portfolioSession: [] }],
    request: { query: TeacherListQuerySchema },
    responses: {
      200: {
        content: { "application/json": { schema: TeacherListSchema } },
        description: "Teacher list",
      },
      ...apiErrorResponses,
    },
  });

  app.openapi(listRoute, async (c) => {
    const db = getDb(c.env);
    const user = await requireCurrentUser(db, c.req.raw, c.env);
    requireRole(user, ["representative", "teacher", "staff"]);
    const result = await listTeachers(db, c.req.valid("query"));
    return c.json(result, 200);
  });

  const getRoute = createRoute({
    method: "get",
    path: "/teachers/{teacherId}",
    tags: ["teachers"],
    security: [{ portfolioSession: [] }],
    request: { params: TeacherParamsSchema },
    responses: {
      200: {
        content: { "application/json": { schema: TeacherResponseSchema } },
        description: "Teacher detail",
      },
      ...apiErrorResponses,
    },
  });

  app.openapi(getRoute, async (c) => {
    const db = getDb(c.env);
    const user = await requireCurrentUser(db, c.req.raw, c.env);
    requireRole(user, ["representative", "teacher", "staff"]);
    const result = await getTeacher(db, c.req.valid("param").teacherId);
    return c.json(result, 200);
  });

  const createRouteDefinition = createRoute({
    method: "post",
    path: "/teachers",
    tags: ["teachers"],
    security: [{ portfolioSession: [] }],
    request: {
      body: {
        content: { "application/json": { schema: CreateTeacherSchema } },
        required: true,
      },
    },
    responses: {
      201: {
        content: { "application/json": { schema: TeacherResponseSchema } },
        description: "Teacher created",
      },
      ...apiErrorResponses,
    },
  });

  app.openapi(createRouteDefinition, async (c) => {
    const db = getDb(c.env);
    const user = await requireCurrentUser(db, c.req.raw, c.env);
    requireRole(user, ["representative"]);
    const result = await createTeacher(db, c.req.valid("json"));
    return c.json(result, 201);
  });

  const updateRoute = createRoute({
    method: "patch",
    path: "/teachers/{teacherId}",
    tags: ["teachers"],
    security: [{ portfolioSession: [] }],
    request: {
      params: TeacherParamsSchema,
      body: {
        content: { "application/json": { schema: UpdateTeacherSchema } },
        required: true,
      },
    },
    responses: {
      200: {
        content: { "application/json": { schema: TeacherResponseSchema } },
        description: "Teacher updated",
      },
      ...apiErrorResponses,
    },
  });

  app.openapi(updateRoute, async (c) => {
    const db = getDb(c.env);
    const user = await requireCurrentUser(db, c.req.raw, c.env);
    requireRole(user, ["representative"]);
    const result = await updateTeacher(
      db,
      c.req.valid("param").teacherId,
      c.req.valid("json"),
    );
    return c.json(result, 200);
  });

  const deleteRoute = createRoute({
    method: "delete",
    path: "/teachers/{teacherId}",
    tags: ["teachers"],
    security: [{ portfolioSession: [] }],
    request: { params: TeacherParamsSchema },
    responses: {
      204: { description: "Teacher deactivated" },
      ...apiErrorResponses,
    },
  });

  app.openapi(deleteRoute, async (c) => {
    const db = getDb(c.env);
    const user = await requireCurrentUser(db, c.req.raw, c.env);
    requireRole(user, ["representative"]);
    await deactivateTeacher(db, c.req.valid("param").teacherId);
    return c.body(null, 204);
  });
}
