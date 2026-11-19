import { createRoute, OpenAPIHono } from "@hono/zod-openapi";

import { getDb } from "../../db/client.js";
import { apiErrorResponses, throwApiError } from "../../shared/errors.js";
import type { AppEnv } from "../../types.js";
import { canViewAllSchedule, requireCurrentUser } from "../auth/session.js";
import { AttendanceListQuerySchema, AttendanceListResponseSchema, AttendanceRecordResponseSchema, CreateAttendanceRecordSchema } from "./schema.js";
import { createAttendanceRecord, listAttendanceRecords } from "./service.js";

export function registerAttendanceRoutes(app: OpenAPIHono<AppEnv>) {
  const listRoute = createRoute({
    method: "get",
    path: "/attendance-records",
    tags: ["attendance"],
    security: [{ portfolioSession: [] }],
    request: { query: AttendanceListQuerySchema },
    responses: { 200: { content: { "application/json": { schema: AttendanceListResponseSchema } }, description: "Attendance record list" }, ...apiErrorResponses },
  });

  app.openapi(listRoute, async (c) => {
    const db = getDb(c.env);
    const user = await requireCurrentUser(db, c.req.raw, c.env);
    const query = c.req.valid("query");
    if (!canViewAllSchedule(user.role) && query.userId && query.userId !== user.id) {
      throwApiError(403, "FORBIDDEN", "Teachers can only view their own attendance records");
    }
    return c.json(await listAttendanceRecords(db, query, canViewAllSchedule(user.role) ? undefined : user.id), 200);
  });

  const createRouteDefinition = createRoute({
    method: "post",
    path: "/attendance-records",
    tags: ["attendance"],
    security: [{ portfolioSession: [] }],
    request: { body: { content: { "application/json": { schema: CreateAttendanceRecordSchema } }, required: true } },
    responses: { 201: { content: { "application/json": { schema: AttendanceRecordResponseSchema } }, description: "Attendance record created for the current user" }, ...apiErrorResponses },
  });

  app.openapi(createRouteDefinition, async (c) => {
    const db = getDb(c.env);
    const user = await requireCurrentUser(db, c.req.raw, c.env);
    return c.json(await createAttendanceRecord(db, user.id, c.req.valid("json")), 201);
  });
}
