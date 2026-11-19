import { z } from "@hono/zod-openapi";

export const recordOutcomes = ["completed", "absent", "cancelled"] as const;

export const LessonRecordSchema = z.object({
  id: z.string().uuid(),
  lessonId: z.string().uuid(),
  actualStart: z.iso.datetime().nullable(),
  actualEnd: z.iso.datetime().nullable(),
  note: z.string().nullable(),
  nextContent: z.string().nullable(),
  recordedByUserId: z.string().uuid().nullable(),
  completedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).openapi("LessonRecord");

export const LessonRecordResponseSchema = z.object({ data: LessonRecordSchema }).openapi("LessonRecordResponse");

export const CreateLessonRecordSchema = z.object({
  outcome: z.enum(recordOutcomes),
  actualStart: z.iso.datetime().optional().nullable(),
  actualEnd: z.iso.datetime().optional().nullable(),
  note: z.string().max(5000).optional().nullable(),
  nextContent: z.string().max(5000).optional().nullable(),
}).openapi("CreateLessonRecordRequest");

export const UpdateLessonRecordSchema = z.object({
  outcome: z.enum(recordOutcomes).optional(),
  actualStart: z.iso.datetime().optional().nullable(),
  actualEnd: z.iso.datetime().optional().nullable(),
  note: z.string().max(5000).optional().nullable(),
  nextContent: z.string().max(5000).optional().nullable(),
}).refine((input) => Object.keys(input).length > 0, {
  message: "At least one field is required",
}).openapi("UpdateLessonRecordRequest");
