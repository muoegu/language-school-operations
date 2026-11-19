import { and, asc, count, eq, ilike } from "drizzle-orm";
import type { z } from "@hono/zod-openapi";

import type { Database } from "../../db/client.js";
import { lessonTypes, lessons, paymentRecords, type LessonType } from "../../db/schema.js";
import { throwApiError } from "../../shared/errors.js";
import { assertResourceIsNotInUse } from "../../shared/resource-dependencies.js";
import type { CreateLessonTypeSchema, LessonTypeListQuerySchema, UpdateLessonTypeSchema } from "./schema.js";

type ListInput = z.infer<typeof LessonTypeListQuerySchema>;
type CreateInput = z.infer<typeof CreateLessonTypeSchema>;
type UpdateInput = z.infer<typeof UpdateLessonTypeSchema>;

const toResponse = (lessonType: LessonType) => ({
  id: lessonType.id,
  name: lessonType.name,
  level: lessonType.level,
  durationMinutes: lessonType.durationMinutes,
  priceMinor: lessonType.priceMinor,
  currency: lessonType.currency,
  isActive: lessonType.isActive,
  createdAt: lessonType.createdAt.toISOString(),
  updatedAt: lessonType.updatedAt.toISOString(),
});

export async function listLessonTypes(db: Database, input: ListInput) {
  const conditions = [eq(lessonTypes.isActive, input.active !== "false")];
  if (input.q) conditions.push(ilike(lessonTypes.name, `%${input.q}%`));
  const where = and(...conditions);
  const offset = (input.page - 1) * input.pageSize;
  const [data, totalResult] = await Promise.all([
    db.select().from(lessonTypes).where(where).orderBy(asc(lessonTypes.name), asc(lessonTypes.id)).limit(input.pageSize).offset(offset),
    db.select({ total: count() }).from(lessonTypes).where(where),
  ]);
  const total = Number(totalResult[0]?.total ?? 0);
  return { data: data.map(toResponse), meta: { page: input.page, pageSize: input.pageSize, total, totalPages: total === 0 ? 0 : Math.ceil(total / input.pageSize) } };
}

export async function getLessonType(db: Database, lessonTypeId: string) {
  const [lessonType] = await db.select().from(lessonTypes).where(eq(lessonTypes.id, lessonTypeId)).limit(1);
  if (!lessonType) throwApiError(404, "RESOURCE_NOT_FOUND", "Lesson type not found");
  return { data: toResponse(lessonType) };
}

export async function createLessonType(db: Database, input: CreateInput) {
  const [lessonType] = await db.insert(lessonTypes).values(input).returning();
  return { data: toResponse(lessonType) };
}

export async function updateLessonType(db: Database, lessonTypeId: string, input: UpdateInput) {
  const [lessonType] = await db.update(lessonTypes).set({ ...input, updatedAt: new Date() }).where(eq(lessonTypes.id, lessonTypeId)).returning();
  if (!lessonType) throwApiError(404, "RESOURCE_NOT_FOUND", "Lesson type not found");
  return { data: toResponse(lessonType) };
}

export async function deactivateLessonType(db: Database, lessonTypeId: string) {
  const [lessonRows, paymentRows] = await Promise.all([
    db.select({ count: count() }).from(lessons).where(eq(lessons.classId, lessonTypeId)),
    db.select({ count: count() }).from(paymentRecords).where(eq(paymentRecords.classId, lessonTypeId)),
  ]);
  assertResourceIsNotInUse("lessonType", lessonTypeId, [
    { type: "lessons", count: Number(lessonRows[0]?.count ?? 0) },
    { type: "paymentRecords", count: Number(paymentRows[0]?.count ?? 0) },
  ]);
  const [lessonType] = await db.update(lessonTypes).set({ isActive: false, updatedAt: new Date() }).where(eq(lessonTypes.id, lessonTypeId)).returning({ id: lessonTypes.id });
  if (!lessonType) throwApiError(404, "RESOURCE_NOT_FOUND", "Lesson type not found");
}
