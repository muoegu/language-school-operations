import { z } from "@hono/zod-openapi";

const AttendanceStatusSchema = z.enum(["present", "late", "absent"]);

export const AttendanceRecordSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  userName: z.string(),
  attendanceDate: z.iso.date(),
  clockInAt: z.iso.datetime().nullable(),
  clockOutAt: z.iso.datetime().nullable(),
  status: AttendanceStatusSchema,
  note: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).openapi("AttendanceRecord");

export const AttendanceListQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
}).refine((input) => !input.from || !input.to || input.from <= input.to, {
  message: "from must be before or equal to to",
  path: ["to"],
}).openapi("AttendanceListQuery");

export const CreateAttendanceRecordSchema = z.object({
  attendanceDate: z.iso.date(),
  clockInAt: z.iso.datetime().nullable().optional(),
  clockOutAt: z.iso.datetime().nullable().optional(),
  status: AttendanceStatusSchema.default("present"),
  note: z.string().trim().max(500).nullable().optional(),
}).refine((input) => !input.clockInAt || !input.clockOutAt || input.clockInAt <= input.clockOutAt, {
  message: "clockInAt must be before or equal to clockOutAt",
  path: ["clockOutAt"],
}).openapi("CreateAttendanceRecordRequest");

export const AttendanceListResponseSchema = z.object({
  data: z.array(AttendanceRecordSchema),
}).openapi("AttendanceListResponse");

export const AttendanceRecordResponseSchema = z.object({
  data: AttendanceRecordSchema,
}).openapi("AttendanceRecordResponse");
