import { z } from "@hono/zod-openapi";

export const TeacherSchema = z
  .object({
    id: z.string().uuid().openapi({ example: "00000000-0000-0000-0000-000000000002" }),
    displayName: z.string().openapi({ example: "田中 愛子" }),
    email: z.string().email().nullable().openapi({ example: "aiko@example.test" }),
    employmentStartDate: z.iso.date().openapi({ example: "2024-04-01" }),
    employmentEndDate: z.iso.date().nullable().openapi({ example: null }),
    isActive: z.boolean().openapi({ example: true }),
    createdAt: z.iso.datetime().openapi({ example: "2026-11-18T03:00:00.000Z" }),
    updatedAt: z.iso.datetime().openapi({ example: "2026-11-18T03:00:00.000Z" }),
  })
  .openapi("Teacher");

export const TeacherListSchema = z
  .object({
    data: z.array(TeacherSchema),
    meta: z.object({
      page: z.number().int().openapi({ example: 1 }),
      pageSize: z.number().int().openapi({ example: 20 }),
      total: z.number().int().openapi({ example: 1 }),
      totalPages: z.number().int().openapi({ example: 1 }),
    }),
  })
  .openapi("TeacherListResponse");

export const TeacherParamsSchema = z
  .object({
    teacherId: z.string().uuid().openapi({ example: "00000000-0000-0000-0000-000000000002" }),
  })
  .openapi("TeacherParams");

export const TeacherListQuerySchema = z
  .object({
    q: z.string().trim().max(100).optional().openapi({ example: "田中" }),
    active: z.enum(["true", "false"]).optional().openapi({ example: "true" }),
    page: z.coerce.number().int().min(1).default(1).openapi({ example: 1 }),
    pageSize: z.coerce.number().int().min(1).max(100).default(20).openapi({ example: 20 }),
  })
  .openapi("TeacherListQuery");

export const CreateTeacherSchema = z
  .object({
    displayName: z.string().trim().min(1).max(100).openapi({ example: "田中 愛子" }),
    email: z.string().email().nullable().optional().openapi({ example: "aiko@example.test" }),
    employmentStartDate: z.iso.date().openapi({ example: "2024-04-01" }),
    employmentEndDate: z.iso.date().nullable().optional().openapi({ example: null }),
  })
  .openapi("CreateTeacherRequest");

export const UpdateTeacherSchema = z
  .object({
    displayName: z.string().trim().min(1).max(100).optional().openapi({ example: "田中 愛子" }),
    email: z.string().email().nullable().optional().openapi({ example: "aiko@example.test" }),
    employmentStartDate: z.iso.date().optional().openapi({ example: "2024-04-01" }),
    employmentEndDate: z.iso.date().nullable().optional().openapi({ example: null }),
    isActive: z.boolean().optional().openapi({ example: true }),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field is required",
  })
  .openapi("UpdateTeacherRequest");

export const TeacherResponseSchema = z
  .object({ data: TeacherSchema })
  .openapi("TeacherResponse");
