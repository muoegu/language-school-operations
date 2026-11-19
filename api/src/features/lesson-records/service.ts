import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import type { z } from "@hono/zod-openapi";

import type { Database } from "../../db/client.js";
import {
  lessonRecords,
  lessonStudents,
  lessons,
  paymentRecordLessons,
  paymentRecords,
  type LessonRecord,
} from "../../db/schema.js";
import { throwApiError } from "../../shared/errors.js";
import { assertResourceIsNotInUse } from "../../shared/resource-dependencies.js";
import { assertViewerCanManageLessonRecord, type LessonViewer } from "../lessons/service.js";
import type { CreateLessonRecordSchema, UpdateLessonRecordSchema } from "./schema.js";

type CreateInput = z.infer<typeof CreateLessonRecordSchema>;
type UpdateInput = z.infer<typeof UpdateLessonRecordSchema>;
const LESSONS_PER_PAYMENT = 5;

function toResponse(record: LessonRecord) {
  return {
    id: record.id,
    lessonId: record.lessonId,
    actualStart: record.actualStartAt?.toISOString() ?? null,
    actualEnd: record.actualEndAt?.toISOString() ?? null,
    note: record.note,
    nextContent: record.nextContent,
    recordedByUserId: record.recordedByUserId,
    completedAt: record.completedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function resolveTimes(input: { outcome: "completed" | "absent" | "cancelled"; actualStart?: string | null; actualEnd?: string | null }) {
  if (input.outcome !== "completed") return { actualStartAt: null, actualEndAt: null };
  if (!input.actualStart || !input.actualEnd) {
    throwApiError(400, "VALIDATION_ERROR", "actualStart and actualEnd are required for completed records");
  }
  const actualStartAt = new Date(input.actualStart);
  const actualEndAt = new Date(input.actualEnd);
  if (Number.isNaN(actualStartAt.getTime()) || Number.isNaN(actualEndAt.getTime())) {
    throwApiError(400, "VALIDATION_ERROR", "actualStart and actualEnd must be valid datetimes");
  }
  if (actualStartAt >= actualEndAt) throwApiError(400, "VALIDATION_ERROR", "actualEnd must be after actualStart");
  return { actualStartAt, actualEndAt };
}

async function getLessonOrThrow(db: Database, lessonId: string) {
  const [lesson] = await db.select({ id: lessons.id, status: lessons.status })
    .from(lessons).where(eq(lessons.id, lessonId)).limit(1);
  if (!lesson) throwApiError(404, "RESOURCE_NOT_FOUND", "Lesson not found");
  return lesson;
}

async function getLessonStudentIds(db: Database, lessonId: string) {
  const rows = await db.select({ studentId: lessonStudents.studentId })
    .from(lessonStudents).where(eq(lessonStudents.lessonId, lessonId));
  if (rows.length === 0) throwApiError(400, "VALIDATION_ERROR", "A lesson must have at least one student");
  return rows.map((row) => row.studentId);
}

function allocatePaymentQuery(studentId: string, lessonId: string) {
  return sql`
    with candidate as (
      select pr.id
      from ${paymentRecords} as pr
      where pr.student_id = ${studentId}
        and pr.status = 'active'
        and pr.payment_status = 'paid'
        and (
          select count(*)
          from ${paymentRecordLessons} as prl
          where prl.payment_record_id = pr.id
        ) < ${LESSONS_PER_PAYMENT}
      order by pr.purchased_at, pr.id
      limit 1
      for update
    ), inserted as (
      insert into ${paymentRecordLessons} (payment_record_id, lesson_id, used_at)
      select id, ${lessonId}, now()
      from candidate
      on conflict do nothing
      returning payment_record_id
    ), updated as (
      update ${paymentRecords} as pr
      set status = case
        when (
          select count(*)
          from ${paymentRecordLessons} as prl
          where prl.payment_record_id = pr.id
        ) >= ${LESSONS_PER_PAYMENT} then 'used_up'::payment_record_status
        else 'active'::payment_record_status
      end,
      updated_at = now()
      where pr.id in (select payment_record_id from inserted)
      returning pr.id
    )
    select case
      when exists (select 1 from updated) then 1
      else (select 1 / count(*) from updated)
    end as allocated
  `;
}

async function writeCompletedLesson(
  db: Database,
  lessonId: string,
  input: CreateInput | UpdateInput,
  viewer: LessonViewer,
  existingRecordId?: string,
) {
  if (!viewer.userId) throwApiError(401, "UNAUTHORIZED", "A logged-in user is required to record a lesson");
  const studentIds = await getLessonStudentIds(db, lessonId);
  const times = resolveTimes({
    outcome: "completed",
    actualStart: input.actualStart,
    actualEnd: input.actualEnd,
  });
  const now = new Date();
  const recordId = existingRecordId ?? crypto.randomUUID();
  const queries = [
    existingRecordId
      ? db.update(lessonRecords).set({
          ...times,
          ...(input.note === undefined ? {} : { note: input.note }),
          ...(input.nextContent === undefined ? {} : { nextContent: input.nextContent }),
          recordedByUserId: viewer.userId,
          completedAt: now,
          updatedAt: now,
        }).where(eq(lessonRecords.id, existingRecordId))
      : db.insert(lessonRecords).values({
          id: recordId,
          lessonId,
          ...times,
          note: input.note ?? null,
          nextContent: input.nextContent ?? null,
          recordedByUserId: viewer.userId,
          completedAt: now,
        }),
    db.update(lessonStudents).set({ participationStatus: "attended", updatedAt: now }).where(eq(lessonStudents.lessonId, lessonId)),
    db.update(lessons).set({ status: "completed", updatedAt: now }).where(and(eq(lessons.id, lessonId), eq(lessons.status, "scheduled"))),
    ...studentIds.map((studentId) => db.execute(allocatePaymentQuery(studentId, lessonId))),
  ];
  await db.batch(queries as [typeof queries[number], ...typeof queries]);
  const [record] = await db.select().from(lessonRecords).where(eq(lessonRecords.id, recordId)).limit(1);
  if (!record) throw new Error("Lesson record could not be created");
  return { data: toResponse(record) };
}

export async function getLessonRecord(db: Database, lessonId: string, viewer: LessonViewer) {
  await getLessonOrThrow(db, lessonId);
  await assertViewerCanManageLessonRecord(db, lessonId, viewer);
  const [record] = await db.select().from(lessonRecords).where(eq(lessonRecords.lessonId, lessonId)).limit(1);
  if (!record) throwApiError(404, "RESOURCE_NOT_FOUND", "Lesson record not found");
  return { data: toResponse(record) };
}

export async function createLessonRecord(db: Database, lessonId: string, input: CreateInput, viewer: LessonViewer) {
  const lesson = await getLessonOrThrow(db, lessonId);
  await assertViewerCanManageLessonRecord(db, lessonId, viewer);
  if (lesson.status !== "scheduled") throwApiError(409, "INVALID_STATUS_TRANSITION", "Only scheduled lessons can be recorded");
  const [existing] = await db.select({ id: lessonRecords.id }).from(lessonRecords)
    .where(eq(lessonRecords.lessonId, lessonId)).limit(1);
  if (existing) throwApiError(409, "DUPLICATE_RESOURCE", "Lesson record already exists");
  if (input.outcome === "completed") return writeCompletedLesson(db, lessonId, input, viewer);
  if (!viewer.userId) throwApiError(401, "UNAUTHORIZED", "A logged-in user is required to record a lesson");
  const now = new Date();
  const recordId = crypto.randomUUID();
  const participationStatus = input.outcome === "absent" ? "absent" as const : "cancelled" as const;
  await db.batch([
    db.insert(lessonRecords).values({ id: recordId, lessonId, ...resolveTimes(input), note: input.note ?? null, nextContent: input.nextContent ?? null, recordedByUserId: viewer.userId }),
    db.update(lessonStudents).set({ participationStatus, updatedAt: now }).where(eq(lessonStudents.lessonId, lessonId)),
    db.update(lessons).set({ status: input.outcome, updatedAt: now }).where(and(eq(lessons.id, lessonId), eq(lessons.status, "scheduled"))),
  ]);
  const [record] = await db.select().from(lessonRecords).where(eq(lessonRecords.id, recordId)).limit(1);
  if (!record) throw new Error("Lesson record could not be created");
  return { data: toResponse(record) };
}

export async function updateLessonRecord(db: Database, lessonId: string, input: UpdateInput, viewer: LessonViewer) {
  const lesson = await getLessonOrThrow(db, lessonId);
  await assertViewerCanManageLessonRecord(db, lessonId, viewer);
  const [current] = await db.select().from(lessonRecords).where(eq(lessonRecords.lessonId, lessonId)).limit(1);
  if (!current) throwApiError(404, "RESOURCE_NOT_FOUND", "Lesson record not found");
  const outcome = input.outcome ?? lesson.status;
  if (outcome !== "completed" && outcome !== "absent" && outcome !== "cancelled") {
    throwApiError(400, "VALIDATION_ERROR", "Invalid lesson record outcome");
  }
  if (lesson.status === "completed" && outcome !== "completed") {
    throwApiError(409, "INVALID_STATUS_TRANSITION", "A completed lesson cannot be reverted after payment consumption");
  }
  if (outcome === "completed" && lesson.status !== "completed") {
    return writeCompletedLesson(db, lessonId, input, viewer, current.id);
  }
  const times = resolveTimes({
    outcome,
    actualStart: input.actualStart === undefined ? current.actualStartAt?.toISOString() : input.actualStart,
    actualEnd: input.actualEnd === undefined ? current.actualEndAt?.toISOString() : input.actualEnd,
  });
  const [record] = await db.update(lessonRecords).set({
    ...times,
    ...(input.note === undefined ? {} : { note: input.note }),
    ...(input.nextContent === undefined ? {} : { nextContent: input.nextContent }),
    ...(viewer.userId === undefined ? {} : { recordedByUserId: viewer.userId }),
    updatedAt: new Date(),
  }).where(eq(lessonRecords.lessonId, lessonId)).returning();
  await db.update(lessons).set({ status: outcome, updatedAt: new Date() }).where(eq(lessons.id, lessonId));
  if (!record) throw new Error("Lesson record could not be updated");
  return { data: toResponse(record) };
}

export async function deleteLessonRecord(db: Database, lessonId: string, viewer: LessonViewer) {
  const lesson = await getLessonOrThrow(db, lessonId);
  await assertViewerCanManageLessonRecord(db, lessonId, viewer);
  if (lesson.status === "completed") {
    throwApiError(409, "INVALID_STATUS_TRANSITION", "A completed lesson record cannot be deleted after payment consumption");
  }
  const [paymentRows] = await db.select({ count: count() }).from(paymentRecordLessons).where(eq(paymentRecordLessons.lessonId, lessonId));
  assertResourceIsNotInUse("lessonRecord", lessonId, [
    { type: "paymentRecordLessons", count: Number(paymentRows?.count ?? 0) },
  ]);
  const [deleted] = await db.delete(lessonRecords).where(eq(lessonRecords.lessonId, lessonId)).returning({ id: lessonRecords.id });
  if (!deleted) throwApiError(404, "RESOURCE_NOT_FOUND", "Lesson record not found");
  await db.update(lessons).set({ status: "scheduled", updatedAt: new Date() }).where(eq(lessons.id, lessonId));
}
