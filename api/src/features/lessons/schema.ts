import { z } from "@hono/zod-openapi";

export const lessonStatuses = [
  "scheduled",
  "completed",
  "absent",
  "cancelled",
] as const;

export const LessonSchema = z
  .object({
    id: z.string().uuid().openapi({ example: "00000000-0000-0000-0000-000000000001" }),
    classId: z.string().uuid().nullable().openapi({ example: "00000000-0000-0000-0000-000000000010" }),
    teacherIds: z.array(z.string().uuid()).openapi({
      example: ["00000000-0000-0000-0000-000000000002"],
    }),
    studentIds: z.array(z.string().uuid()).openapi({
      example: ["00000000-0000-0000-0000-000000000003"],
    }),
    /** @deprecated Use teacherIds. Kept during API migration. */
    teacherId: z.string().uuid().openapi({ example: "00000000-0000-0000-0000-000000000002" }),
    /** @deprecated Use studentIds. Kept during API migration. */
    studentId: z.string().uuid().openapi({ example: "00000000-0000-0000-0000-000000000003" }),
    title: z.string().openapi({ example: "Business Japanese" }),
    level: z.string().nullable().openapi({ example: "intermediate" }),
    scheduledStart: z.iso.datetime().openapi({ example: "2026-11-20T01:00:00.000Z" }),
    scheduledEnd: z.iso.datetime().openapi({ example: "2026-11-20T02:00:00.000Z" }),
    status: z.enum(lessonStatuses).openapi({ example: "scheduled" }),
    record: z.object({
      id: z.string().uuid(),
      actualStart: z.iso.datetime().nullable(),
      actualEnd: z.iso.datetime().nullable(),
      note: z.string().nullable(),
      nextContent: z.string().nullable(),
      createdAt: z.iso.datetime(),
    }).nullable(),
  })
  .openapi("Lesson");

export const LessonListSchema = z
  .object({
    data: z.array(LessonSchema),
    meta: z.object({
      page: z.number().int().openapi({ example: 1 }),
      pageSize: z.number().int().openapi({ example: 20 }),
      total: z.number().int().openapi({ example: 1 }),
      totalPages: z.number().int().openapi({ example: 1 }),
    }),
  })
  .openapi("LessonListResponse");

export const CalendarLessonSchema = z
  .object({
    id: z.string().uuid(),
    classId: z.string().uuid().nullable(),
    title: z.string(),
    level: z.string().nullable(),
    scheduledStart: z.iso.datetime(),
    scheduledEnd: z.iso.datetime(),
    status: z.enum(lessonStatuses),
    teacherIds: z.array(z.string().uuid()),
    teacherNames: z.array(z.string()),
    studentIds: z.array(z.string().uuid()),
    studentNames: z.array(z.string()),
  })
  .openapi("CalendarLesson");

export const CalendarLessonQuerySchema = z
  .object({
    from: z.iso.datetime().openapi({ example: "2026-11-01T00:00:00.000Z" }),
    to: z.iso.datetime().openapi({ example: "2026-12-01T00:00:00.000Z" }),
  })
  .refine((input) => new Date(input.from) < new Date(input.to), {
    path: ["to"],
    message: "to must be after from",
  })
  .openapi("CalendarLessonQuery");

export const CalendarLessonListSchema = z
  .object({ data: z.array(CalendarLessonSchema) })
  .openapi("CalendarLessonListResponse");

export const LessonParamsSchema = z
  .object({
    lessonId: z.string().uuid().openapi({ example: "00000000-0000-0000-0000-000000000001" }),
  })
  .openapi("LessonParams");

export const LessonQuerySchema = z
  .object({
    q: z.string().trim().max(100).optional().openapi({ example: "会話" }),
    status: z.enum(lessonStatuses).optional().openapi({ example: "scheduled" }),
    teacherId: z.string().uuid().optional(),
    studentId: z.string().uuid().optional(),
    from: z.iso.datetime().optional().openapi({ example: "2026-11-20T00:00:00.000Z" }),
    to: z.iso.datetime().optional().openapi({ example: "2026-11-21T00:00:00.000Z" }),
    sortBy: z.enum(["scheduledStart", "title", "status"]).default("scheduledStart").openapi({ example: "scheduledStart" }),
    sortOrder: z.enum(["asc", "desc"]).default("desc").openapi({ example: "desc" }),
    page: z.coerce.number().int().min(1).default(1).openapi({ example: 1 }),
    pageSize: z.coerce.number().int().min(1).max(100).default(10).openapi({ example: 10 }),
  })
  .refine(
    (input) =>
      input.from === undefined ||
      input.to === undefined ||
      new Date(input.from) < new Date(input.to),
    {
      path: ["to"],
      message: "to must be after from",
    },
  )
  .openapi("LessonQuery");

export const CreateLessonSchema = z
  .object({
    classId: z.string().uuid().openapi({ example: "00000000-0000-0000-0000-000000000010" }),
    teacherIds: z.array(z.string().uuid()).min(1).optional().openapi({
      example: ["00000000-0000-0000-0000-000000000002"],
    }),
    studentIds: z.array(z.string().uuid()).min(1).optional().openapi({
      example: ["00000000-0000-0000-0000-000000000003"],
    }),
    /** @deprecated Use teacherIds. */
    teacherId: z.string().uuid().optional(),
    /** @deprecated Use studentIds. */
    studentId: z.string().uuid().optional(),
    title: z.string().min(1).max(150).openapi({ example: "Business Japanese" }),
    level: z.string().max(30).optional().openapi({ example: "intermediate" }),
    scheduledStart: z.iso.datetime().openapi({ example: "2026-11-20T01:00:00.000Z" }),
    scheduledEnd: z.iso.datetime().openapi({ example: "2026-11-20T02:00:00.000Z" }),
  })
  .refine((input) => input.teacherIds?.length || input.teacherId, {
    path: ["teacherIds"],
    message: "At least one teacher is required",
  })
  .refine((input) => input.studentIds?.length || input.studentId, {
    path: ["studentIds"],
    message: "At least one student is required",
  })
  .refine((input) => new Date(input.scheduledStart) < new Date(input.scheduledEnd), {
    path: ["scheduledEnd"],
    message: "scheduledEnd must be after scheduledStart",
  })
  .openapi("CreateLessonRequest");

export const CreateLessonResponseSchema = z
  .object({ data: LessonSchema })
  .openapi("CreateLessonResponse");

export const LessonResponseSchema = z
  .object({ data: LessonSchema })
  .openapi("LessonResponse");

export const UpdateLessonSchema = z
  .object({
    classId: z.string().uuid().optional(),
    teacherIds: z.array(z.string().uuid()).min(1).optional().openapi({
      example: ["00000000-0000-0000-0000-000000000002"],
    }),
    studentIds: z.array(z.string().uuid()).min(1).optional().openapi({
      example: ["00000000-0000-0000-0000-000000000003"],
    }),
    /** @deprecated Use teacherIds. */
    teacherId: z.string().uuid().optional(),
    /** @deprecated Use studentIds. */
    studentId: z.string().uuid().optional(),
    title: z.string().min(1).max(150).optional(),
    level: z.string().max(30).nullable().optional(),
    scheduledStart: z.iso.datetime().optional(),
    scheduledEnd: z.iso.datetime().optional(),
    statusReason: z.string().max(500).nullable().optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field is required",
  })
  .openapi("UpdateLessonRequest");
