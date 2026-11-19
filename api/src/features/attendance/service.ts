import { and, asc, eq, gte, lte } from "drizzle-orm";
import type { z } from "@hono/zod-openapi";

import type { Database } from "../../db/client.js";
import { attendanceRecords, users, type AttendanceRecord } from "../../db/schema.js";
import { throwApiError } from "../../shared/errors.js";
import type { AttendanceListQuerySchema, CreateAttendanceRecordSchema } from "./schema.js";

type ListInput = z.infer<typeof AttendanceListQuerySchema>;
type CreateInput = z.infer<typeof CreateAttendanceRecordSchema>;

function toDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function toResponse(record: AttendanceRecord, userName: string) {
  return {
    id: record.id,
    userId: record.userId,
    userName,
    attendanceDate: record.attendanceDate.toISOString().slice(0, 10),
    clockInAt: record.clockInAt?.toISOString() ?? null,
    clockOutAt: record.clockOutAt?.toISOString() ?? null,
    status: record.status,
    note: record.note,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function listAttendanceRecords(db: Database, input: ListInput, defaultUserId?: string) {
  const conditions = [];
  const targetUserId = input.userId ?? defaultUserId;
  if (targetUserId) conditions.push(eq(attendanceRecords.userId, targetUserId));
  if (input.from) conditions.push(gte(attendanceRecords.attendanceDate, toDate(input.from)));
  if (input.to) conditions.push(lte(attendanceRecords.attendanceDate, toDate(input.to)));

  const rows = await db.select({ record: attendanceRecords, userName: users.displayName })
    .from(attendanceRecords)
    .innerJoin(users, eq(users.id, attendanceRecords.userId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(attendanceRecords.attendanceDate), asc(users.displayName));

  return { data: rows.map(({ record, userName }) => toResponse(record, userName)) };
}

export async function createAttendanceRecord(db: Database, userId: string, input: CreateInput) {
  const [existing] = await db.select({ id: attendanceRecords.id })
    .from(attendanceRecords)
    .where(and(eq(attendanceRecords.userId, userId), eq(attendanceRecords.attendanceDate, toDate(input.attendanceDate))))
    .limit(1);
  if (existing) throwApiError(409, "DUPLICATE_RESOURCE", "An attendance record already exists for this date");

  const [record] = await db.insert(attendanceRecords).values({
    userId,
    attendanceDate: toDate(input.attendanceDate),
    clockInAt: input.clockInAt ? new Date(input.clockInAt) : null,
    clockOutAt: input.clockOutAt ? new Date(input.clockOutAt) : null,
    status: input.status,
    note: input.note ?? null,
  }).returning();
  if (!record) throw new Error("Attendance record could not be created");

  const [user] = await db.select({ displayName: users.displayName }).from(users).where(eq(users.id, userId)).limit(1);
  return { data: toResponse(record, user?.displayName ?? "") };
}
