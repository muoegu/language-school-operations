import { createRoute, OpenAPIHono } from "@hono/zod-openapi";

import type { AppEnv } from "../../types.js";
import { getDb } from "../../db/client.js";
import { requireCurrentUser, requireRole } from "../auth/session.js";
import { apiErrorResponses } from "../../shared/errors.js";
import {
  CreateStudentSchema,
  StudentListQuerySchema,
  StudentListSchema,
  StudentParamsSchema,
  StudentResponseSchema,
  UpdateStudentSchema,
} from "./schema.js";
import {
  createStudent,
  deactivateStudent,
  getStudent,
  listStudents,
  updateStudent,
} from "./service.js";

export function registerStudentRoutes(app: OpenAPIHono<AppEnv>) {
  const listRoute = createRoute({
    method: "get",
    path: "/students",
    tags: ["students"],
    security: [{ portfolioSession: [] }],
    request: { query: StudentListQuerySchema },
    responses: {
      200: {
        content: { "application/json": { schema: StudentListSchema } },
        description: "Student list",
      },
      ...apiErrorResponses,
    },
  });

  app.openapi(listRoute, async (c) => {
    const db = getDb(c.env);
    const user = await requireCurrentUser(db, c.req.raw, c.env);
    const result = await listStudents(db, c.req.valid("query"), {
      teacherId: user.teacherId ?? undefined,
      canViewAll: user.role === "representative" || user.role === "staff",
    });
    return c.json(result, 200);
  });

  const getRoute = createRoute({
    method: "get",
    path: "/students/{studentId}",
    tags: ["students"],
    security: [{ portfolioSession: [] }],
    request: { params: StudentParamsSchema },
    responses: {
      200: {
        content: { "application/json": { schema: StudentResponseSchema } },
        description: "Student detail",
      },
      ...apiErrorResponses,
    },
  });

  app.openapi(getRoute, async (c) => {
    const db = getDb(c.env);
    const user = await requireCurrentUser(db, c.req.raw, c.env);
    const result = await getStudent(db, c.req.valid("param").studentId, {
      teacherId: user.teacherId ?? undefined,
      canViewAll: user.role === "representative" || user.role === "staff",
    });
    return c.json(result, 200);
  });

  const createRouteDefinition = createRoute({
    method: "post",
    path: "/students",
    tags: ["students"],
    security: [{ portfolioSession: [] }],
    request: {
      body: {
        content: { "application/json": { schema: CreateStudentSchema } },
        required: true,
      },
    },
    responses: {
      201: {
        content: { "application/json": { schema: StudentResponseSchema } },
        description: "Student created",
      },
      ...apiErrorResponses,
    },
  });

  app.openapi(createRouteDefinition, async (c) => {
    const db = getDb(c.env);
    const user = await requireCurrentUser(db, c.req.raw, c.env);
    requireRole(user, ["representative"]);
    const result = await createStudent(db, c.req.valid("json"));
    return c.json(result, 201);
  });

  const updateRoute = createRoute({
    method: "patch",
    path: "/students/{studentId}",
    tags: ["students"],
    security: [{ portfolioSession: [] }],
    request: {
      params: StudentParamsSchema,
      body: {
        content: { "application/json": { schema: UpdateStudentSchema } },
        required: true,
      },
    },
    responses: {
      200: {
        content: { "application/json": { schema: StudentResponseSchema } },
        description: "Student updated",
      },
      ...apiErrorResponses,
    },
  });

  app.openapi(updateRoute, async (c) => {
    const db = getDb(c.env);
    const user = await requireCurrentUser(db, c.req.raw, c.env);
    requireRole(user, ["representative"]);
    const result = await updateStudent(
      db,
      c.req.valid("param").studentId,
      c.req.valid("json"),
    );
    return c.json(result, 200);
  });

  const deleteRoute = createRoute({
    method: "delete",
    path: "/students/{studentId}",
    tags: ["students"],
    security: [{ portfolioSession: [] }],
    request: { params: StudentParamsSchema },
    responses: {
      204: { description: "Student deactivated" },
      ...apiErrorResponses,
    },
  });

  app.openapi(deleteRoute, async (c) => {
    const db = getDb(c.env);
    const user = await requireCurrentUser(db, c.req.raw, c.env);
    requireRole(user, ["representative"]);
    await deactivateStudent(db, c.req.valid("param").studentId);
    return c.body(null, 204);
  });
}
