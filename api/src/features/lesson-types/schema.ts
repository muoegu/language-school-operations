import { z } from "@hono/zod-openapi";

const LessonTypeFields = {
  name: z.string().trim().min(1).max(150).openapi({ example: "マンツーマン会話 60分" }),
  level: z.string().trim().min(1).max(30).openapi({ example: "全レベル" }),
  durationMinutes: z.number().int().min(1).max(480).openapi({ example: 60 }),
  priceMinor: z.number().int().min(0).openapi({ example: 4500 }),
  currency: z.string().trim().length(3).default("JPY").openapi({ example: "JPY" }),
};

export const LessonTypeSchema = z.object({
  id: z.string().uuid(),
  ...LessonTypeFields,
  isActive: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).openapi("LessonType");

export const LessonTypeListSchema = z.object({
  data: z.array(LessonTypeSchema),
  meta: z.object({
    page: z.number().int(), pageSize: z.number().int(), total: z.number().int(), totalPages: z.number().int(),
  }),
}).openapi("LessonTypeListResponse");

export const LessonTypeParamsSchema = z.object({
  classId: z.string().uuid(),
}).openapi("LessonTypeParams");

export const LessonTypeListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  active: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
}).openapi("LessonTypeListQuery");

export const CreateLessonTypeSchema = z.object(LessonTypeFields).openapi("CreateLessonTypeRequest");

export const UpdateLessonTypeSchema = z.object({
  name: LessonTypeFields.name.optional(),
  level: LessonTypeFields.level.optional(),
  durationMinutes: LessonTypeFields.durationMinutes.optional(),
  priceMinor: LessonTypeFields.priceMinor.optional(),
  currency: z.string().trim().length(3).optional().openapi({ example: "JPY" }),
  isActive: z.boolean().optional(),
}).refine((input) => Object.keys(input).length > 0, { message: "At least one field is required" })
  .openapi("UpdateLessonTypeRequest");

export const LessonTypeResponseSchema = z.object({ data: LessonTypeSchema }).openapi("LessonTypeResponse");
