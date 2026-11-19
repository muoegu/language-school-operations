import { z } from "@hono/zod-openapi";

export const StudentSchema = z
  .object({
    id: z.string().uuid().openapi({ example: "00000000-0000-0000-0000-000000000003" }),
    displayName: z.string().openapi({ example: "王 小明" }),
    email: z.string().email().nullable().openapi({ example: "xiaoming@example.test" }),
    birthDate: z.iso.date().nullable().openapi({ example: "1995-11-21" }),
    level: z.string().nullable().openapi({ example: "beginner" }),
    classId: z.string().uuid().nullable(),
    className: z.string().nullable(),
    isActive: z.boolean().openapi({ example: true }),
    createdAt: z.iso.datetime().openapi({ example: "2026-11-18T03:00:00.000Z" }),
    updatedAt: z.iso.datetime().openapi({ example: "2026-11-18T03:00:00.000Z" }),
  })
  .openapi("Student");

export const StudentListSchema = z
  .object({
    data: z.array(StudentSchema),
    meta: z.object({
      page: z.number().int().openapi({ example: 1 }),
      pageSize: z.number().int().openapi({ example: 20 }),
      total: z.number().int().openapi({ example: 1 }),
      totalPages: z.number().int().openapi({ example: 1 }),
    }),
  })
  .openapi("StudentListResponse");

export const StudentParamsSchema = z
  .object({
    studentId: z.string().uuid().openapi({ example: "00000000-0000-0000-0000-000000000003" }),
  })
  .openapi("StudentParams");

export const StudentListQuerySchema = z
  .object({
    q: z.string().trim().max(100).optional().openapi({ example: "王" }),
    active: z.enum(["true", "false"]).optional().openapi({ example: "true" }),
    page: z.coerce.number().int().min(1).default(1).openapi({ example: 1 }),
    pageSize: z.coerce.number().int().min(1).max(100).default(20).openapi({ example: 20 }),
  })
  .openapi("StudentListQuery");

export const CreateStudentSchema = z
  .object({
    displayName: z.string().trim().min(1).max(100).openapi({ example: "王 小明" }),
    email: z.string().email().nullable().optional().openapi({ example: "xiaoming@example.test" }),
    birthDate: z.iso.date().nullable().optional().openapi({ example: "1995-11-21" }),
    level: z.string().trim().max(30).nullable().optional().openapi({ example: "beginner" }),
    classId: z.string().uuid().nullable().optional(),
  })
  .openapi("CreateStudentRequest");

export const UpdateStudentSchema = z
  .object({
    displayName: z.string().trim().min(1).max(100).optional().openapi({ example: "王 小明" }),
    email: z.string().email().nullable().optional().openapi({ example: "xiaoming@example.test" }),
    birthDate: z.iso.date().nullable().optional().openapi({ example: "1995-11-21" }),
    level: z.string().trim().max(30).nullable().optional().openapi({ example: "intermediate" }),
    classId: z.string().uuid().nullable().optional(),
    isActive: z.boolean().optional().openapi({ example: true }),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field is required",
  })
  .openapi("UpdateStudentRequest");

export const StudentResponseSchema = z
  .object({ data: StudentSchema })
  .openapi("StudentResponse");

export const StudentDeleteResponseSchema = z
  .object({ deactivated: z.literal(true) })
  .openapi("StudentDeleteResponse");
