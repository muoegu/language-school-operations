import { and, asc, count, desc, eq, exists, gt, gte, ilike, inArray, lt, ne } from "drizzle-orm";
import type { z } from "@hono/zod-openapi";

import type { Database } from "../../db/client.js";
import {
  lessonStudents,
  lessonTeachers,
  lessonRecords,
  lessons,
  paymentRecordLessons,
  students,
  teacherStudentAssignments,
  teachers,
  type Lesson,
} from "../../db/schema.js";
import { throwApiError } from "../../shared/errors.js";
import { assertResourceIsNotInUse } from "../../shared/resource-dependencies.js";
import type { CalendarLessonQuerySchema, CreateLessonSchema, LessonQuerySchema, UpdateLessonSchema } from "./schema.js";

type CreateLessonInput = z.infer<typeof CreateLessonSchema>;
type LessonQueryInput = z.infer<typeof LessonQuerySchema>;
type CalendarLessonQueryInput = z.infer<typeof CalendarLessonQuerySchema>;
type UpdateLessonInput = z.infer<typeof UpdateLessonSchema>;

type ParticipantIds = { teacherIds: string[]; studentIds: string[] };
export type LessonViewer = {
  userId?: string;
  teacherId?: string;
  canViewAll: boolean;
  canViewRecords: boolean;
  canManageLessonRecords?: boolean;
  canManageSchedule: boolean;
};

export function normalizeParticipants(input: {
  teacherIds?: string[];
  studentIds?: string[];
  teacherId?: string;
  studentId?: string;
}): ParticipantIds {
  const teacherIds = [...new Set(input.teacherIds ?? (input.teacherId ? [input.teacherId] : []))];
  const studentIds = [...new Set(input.studentIds ?? (input.studentId ? [input.studentId] : []))];
  if (teacherIds.length === 0 || studentIds.length === 0) {
    throwApiError(400, "VALIDATION_ERROR", "At least one teacher and student are required");
  }
  return { teacherIds, studentIds };
}

async function getParticipants(db: Database, lessonIds: string[]) {
  if (lessonIds.length === 0) return new Map<string, ParticipantIds>();
  const [teacherRows, studentRows] = await Promise.all([
    db.select({ lessonId: lessonTeachers.lessonId, teacherId: lessonTeachers.teacherId })
      .from(lessonTeachers).where(inArray(lessonTeachers.lessonId, lessonIds)),
    db.select({ lessonId: lessonStudents.lessonId, studentId: lessonStudents.studentId })
      .from(lessonStudents).where(inArray(lessonStudents.lessonId, lessonIds)),
  ]);
  const participants = new Map<string, ParticipantIds>();
  for (const lessonId of lessonIds) participants.set(lessonId, { teacherIds: [], studentIds: [] });
  for (const row of teacherRows) participants.get(row.lessonId)?.teacherIds.push(row.teacherId);
  for (const row of studentRows) participants.get(row.lessonId)?.studentIds.push(row.studentId);
  return participants;
}

type LessonRecordSummary = {
  id: string;
  actualStartAt: Date | null;
  actualEndAt: Date | null;
  note: string | null;
  nextContent: string | null;
  createdAt: Date;
};

function toRecordSummary(record: LessonRecordSummary | undefined) {
  if (!record) return null;
  return {
    id: record.id,
    actualStart: record.actualStartAt?.toISOString() ?? null,
    actualEnd: record.actualEndAt?.toISOString() ?? null,
    note: record.note,
    nextContent: record.nextContent,
    createdAt: record.createdAt.toISOString(),
  };
}

function toLessonResponse(lesson: Lesson, participants: ParticipantIds, record?: LessonRecordSummary) {
  return {
    id: lesson.id,
    classId: lesson.classId,
    teacherIds: participants.teacherIds,
    studentIds: participants.studentIds,
    // Deprecated compatibility fields. Remove after the frontend migration.
    teacherId: participants.teacherIds[0] ?? lesson.teacherId,
    studentId: participants.studentIds[0] ?? lesson.studentId,
    title: lesson.title,
    level: lesson.level,
    scheduledStart: lesson.scheduledStartAt.toISOString(),
    scheduledEnd: lesson.scheduledEndAt.toISOString(),
    status: lesson.status,
    record: toRecordSummary(record),
  };
}

async function getLessonParticipants(db: Database, lessonId: string) {
  const participants = await getParticipants(db, [lessonId]);
  const result = participants.get(lessonId);
  if (result?.teacherIds.length && result.studentIds.length) return result;
  const [lesson] = await db.select({ teacherId: lessons.teacherId, studentId: lessons.studentId })
    .from(lessons).where(eq(lessons.id, lessonId)).limit(1);
  return {
    teacherIds: result?.teacherIds.length ? result.teacherIds : lesson?.teacherId ? [lesson.teacherId] : [],
    studentIds: result?.studentIds.length ? result.studentIds : lesson?.studentId ? [lesson.studentId] : [],
  };
}

async function assertActiveReferences(db: Database, participants: ParticipantIds) {
  const [activeTeachers, activeStudents] = await Promise.all([
    db.select({ id: teachers.id }).from(teachers)
      .where(and(inArray(teachers.id, participants.teacherIds), eq(teachers.isActive, true))),
    db.select({ id: students.id }).from(students)
      .where(and(inArray(students.id, participants.studentIds), eq(students.isActive, true))),
  ]);
  if (activeTeachers.length !== participants.teacherIds.length) {
    throwApiError(404, "RESOURCE_NOT_FOUND", "One or more active teachers were not found");
  }
  if (activeStudents.length !== participants.studentIds.length) {
    throwApiError(404, "RESOURCE_NOT_FOUND", "One or more active students were not found");
  }
}

async function assertViewerCanManageParticipants(
  db: Database,
  participants: ParticipantIds,
  viewer: LessonViewer,
) {
  if (!viewer.canManageSchedule) {
    throwApiError(403, "FORBIDDEN", "This role cannot manage schedules");
  }
  if (viewer.canViewAll) return;
  if (!viewer.teacherId || participants.teacherIds.length !== 1 || participants.teacherIds[0] !== viewer.teacherId) {
    throwApiError(403, "FORBIDDEN", "Teachers can only manage their own lessons");
  }
  const assignments = await db.select({ studentId: teacherStudentAssignments.studentId })
    .from(teacherStudentAssignments)
    .where(and(
      eq(teacherStudentAssignments.teacherId, viewer.teacherId),
      inArray(teacherStudentAssignments.studentId, participants.studentIds),
      eq(teacherStudentAssignments.isActive, true),
    ));
  if (new Set(assignments.map((assignment) => assignment.studentId)).size !== participants.studentIds.length) {
    throwApiError(403, "FORBIDDEN", "Teachers can only manage lessons for assigned students");
  }
}

export async function assertViewerCanManageLesson(db: Database, lessonId: string, viewer: LessonViewer) {
  if (!viewer.canManageSchedule) {
    throwApiError(403, "FORBIDDEN", "This role cannot manage schedules");
  }
  if (viewer.canViewAll) return;
  if (!viewer.teacherId) throwApiError(403, "FORBIDDEN", "You do not have access to this lesson");
  const [participant] = await db.select({ lessonId: lessonTeachers.lessonId })
    .from(lessonTeachers)
    .where(and(eq(lessonTeachers.lessonId, lessonId), eq(lessonTeachers.teacherId, viewer.teacherId)))
    .limit(1);
  if (!participant) throwApiError(403, "FORBIDDEN", "You do not have access to this lesson");
}

export async function assertViewerCanManageLessonRecord(db: Database, lessonId: string, viewer: LessonViewer) {
  if (!viewer.canManageLessonRecords) {
    throwApiError(403, "FORBIDDEN", "This role cannot manage lesson records");
  }
  if (viewer.canViewAll) return;
  if (!viewer.teacherId) throwApiError(403, "FORBIDDEN", "You do not have access to this lesson record");
  const [participant] = await db.select({ lessonId: lessonTeachers.lessonId })
    .from(lessonTeachers)
    .where(and(eq(lessonTeachers.lessonId, lessonId), eq(lessonTeachers.teacherId, viewer.teacherId)))
    .limit(1);
  if (!participant) throwApiError(403, "FORBIDDEN", "You do not have access to this lesson record");
}

function assertDateRange(start: Date, end: Date) {
  if (start >= end) throwApiError(400, "VALIDATION_ERROR", "scheduledEnd must be after scheduledStart");
}

async function assertNoTeacherScheduleConflict(
  db: Database,
  teacherIds: string[],
  scheduledStartAt: Date,
  scheduledEndAt: Date,
  lessonId?: string,
) {
  const [conflict] = await db.select({ id: lessons.id }).from(lessons)
    .innerJoin(lessonTeachers, eq(lessonTeachers.lessonId, lessons.id))
    .where(and(
      inArray(lessonTeachers.teacherId, teacherIds),
      eq(lessons.status, "scheduled"),
      lt(lessons.scheduledStartAt, scheduledEndAt),
      gt(lessons.scheduledEndAt, scheduledStartAt),
      lessonId ? ne(lessons.id, lessonId) : undefined,
    )).limit(1);
  if (conflict) throwApiError(409, "SCHEDULE_CONFLICT", "One of the teachers already has a lesson in this time range");
}

export async function listLessons(db: Database, input: LessonQueryInput, viewer: LessonViewer) {
  const where = and(
    viewer.canViewAll ? undefined : viewer.teacherId ? exists(db.select({ id: lessonTeachers.lessonId }).from(lessonTeachers)
      .where(and(eq(lessonTeachers.lessonId, lessons.id), eq(lessonTeachers.teacherId, viewer.teacherId)))) : undefined,
    input.q ? ilike(lessons.title, `%${input.q}%`) : undefined,
    input.status ? eq(lessons.status, input.status) : undefined,
    input.teacherId ? exists(db.select({ id: lessonTeachers.lessonId }).from(lessonTeachers)
      .where(and(eq(lessonTeachers.lessonId, lessons.id), eq(lessonTeachers.teacherId, input.teacherId)))) : undefined,
    input.studentId ? exists(db.select({ id: lessonStudents.lessonId }).from(lessonStudents)
      .where(and(eq(lessonStudents.lessonId, lessons.id), eq(lessonStudents.studentId, input.studentId)))) : undefined,
    input.from ? gte(lessons.scheduledStartAt, new Date(input.from)) : undefined,
    input.to ? lt(lessons.scheduledStartAt, new Date(input.to)) : undefined,
  );
  const sortColumn = input.sortBy === "title" ? lessons.title : input.sortBy === "status" ? lessons.status : lessons.scheduledStartAt;
  const sortDirection = input.sortOrder === "asc" ? asc : desc;
  const offset = (input.page - 1) * input.pageSize;
  const [data, totalResult] = await Promise.all([
    db.select().from(lessons).where(where)
      .orderBy(sortDirection(sortColumn), desc(lessons.id)).limit(input.pageSize).offset(offset),
    db.select({ total: count() }).from(lessons).where(where),
  ]);
  const participants = await getParticipants(db, data.map((lesson) => lesson.id));
  const records = data.length === 0 ? [] : await db.select({
    id: lessonRecords.id,
    lessonId: lessonRecords.lessonId,
    actualStartAt: lessonRecords.actualStartAt,
    actualEndAt: lessonRecords.actualEndAt,
    note: lessonRecords.note,
    nextContent: lessonRecords.nextContent,
    createdAt: lessonRecords.createdAt,
  }).from(lessonRecords).where(inArray(lessonRecords.lessonId, data.map((lesson) => lesson.id)));
  const recordsByLessonId = new Map(records.map((record) => [record.lessonId, record]));
  const total = Number(totalResult[0]?.total ?? 0);
  return {
    data: data.map((lesson) => toLessonResponse(lesson, participants.get(lesson.id) ?? {
      teacherIds: lesson.teacherId ? [lesson.teacherId] : [],
      studentIds: lesson.studentId ? [lesson.studentId] : [],
    }, viewer.canViewRecords ? recordsByLessonId.get(lesson.id) : undefined)),
    meta: { page: input.page, pageSize: input.pageSize, total, totalPages: total === 0 ? 0 : Math.ceil(total / input.pageSize) },
  };
}

export async function listCalendarLessons(db: Database, input: CalendarLessonQueryInput, viewer: LessonViewer) {
  const where = and(
    viewer.canViewAll ? undefined : viewer.teacherId ? exists(db.select({ id: lessonTeachers.lessonId }).from(lessonTeachers)
      .where(and(eq(lessonTeachers.lessonId, lessons.id), eq(lessonTeachers.teacherId, viewer.teacherId)))) : undefined,
    gte(lessons.scheduledStartAt, new Date(input.from)),
    lt(lessons.scheduledStartAt, new Date(input.to)),
  );
  const data = await db.select().from(lessons).where(where)
    .orderBy(asc(lessons.scheduledStartAt), asc(lessons.id));
  const participants = await getParticipants(db, data.map((lesson) => lesson.id));
  for (const lesson of data) {
    const current = participants.get(lesson.id);
    if (current && current.teacherIds.length === 0 && lesson.teacherId) current.teacherIds = [lesson.teacherId];
    if (current && current.studentIds.length === 0 && lesson.studentId) current.studentIds = [lesson.studentId];
  }
  const teacherIds = [...new Set([...participants.values()].flatMap((item) => item.teacherIds))];
  const studentIds = [...new Set([...participants.values()].flatMap((item) => item.studentIds))];
  const [teacherRows, studentRows] = await Promise.all([
    teacherIds.length > 0
      ? db.select({ id: teachers.id, displayName: teachers.displayName }).from(teachers).where(inArray(teachers.id, teacherIds))
      : Promise.resolve([]),
    studentIds.length > 0
      ? db.select({ id: students.id, displayName: students.displayName }).from(students).where(inArray(students.id, studentIds))
      : Promise.resolve([]),
  ]);
  const teacherNames = new Map(teacherRows.map((teacher) => [teacher.id, teacher.displayName]));
  const studentNames = new Map(studentRows.map((student) => [student.id, student.displayName]));

  return {
    data: data.map((lesson) => {
      const lessonParticipants = participants.get(lesson.id) ?? {
        teacherIds: lesson.teacherId ? [lesson.teacherId] : [],
        studentIds: lesson.studentId ? [lesson.studentId] : [],
      };
      return {
        id: lesson.id,
        classId: lesson.classId,
        title: lesson.title,
        level: lesson.level,
        scheduledStart: lesson.scheduledStartAt.toISOString(),
        scheduledEnd: lesson.scheduledEndAt.toISOString(),
        status: lesson.status,
        teacherIds: lessonParticipants.teacherIds,
        teacherNames: lessonParticipants.teacherIds.map((id) => teacherNames.get(id)).filter((name): name is string => Boolean(name)),
        studentIds: lessonParticipants.studentIds,
        studentNames: lessonParticipants.studentIds.map((id) => studentNames.get(id)).filter((name): name is string => Boolean(name)),
      };
    }),
  };
}

export async function createLesson(db: Database, input: CreateLessonInput, viewer: LessonViewer) {
  const participants = normalizeParticipants(input);
  const scheduledStartAt = new Date(input.scheduledStart);
  const scheduledEndAt = new Date(input.scheduledEnd);
  assertDateRange(scheduledStartAt, scheduledEndAt);
  await assertActiveReferences(db, participants);
  await assertViewerCanManageParticipants(db, participants, viewer);
  await assertNoTeacherScheduleConflict(db, participants.teacherIds, scheduledStartAt, scheduledEndAt);
  const lessonId = crypto.randomUUID();
  await db.batch([
    db.insert(lessons).values({
      id: lessonId,
      classId: input.classId,
      teacherId: participants.teacherIds[0], studentId: participants.studentIds[0], title: input.title,
      level: input.level, scheduledStartAt, scheduledEndAt,
    }),
    db.insert(lessonTeachers).values(participants.teacherIds.map((teacherId, index) => ({
      lessonId,
      teacherId,
      role: index === 0 ? ("primary" as const) : ("assistant" as const),
    }))),
    db.insert(lessonStudents).values(participants.studentIds.map((studentId) => ({ lessonId, studentId }))),
  ]);
  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
  if (!lesson) throw new Error("Lesson could not be created");
  return { data: toLessonResponse(lesson, participants) };
}

export async function getLesson(db: Database, lessonId: string, viewer: LessonViewer) {
  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
  if (!lesson) throwApiError(404, "RESOURCE_NOT_FOUND", "Lesson not found");
  if (!viewer.canViewAll && (!viewer.teacherId || !(await db.select({ id: lessonTeachers.lessonId })
    .from(lessonTeachers)
    .where(and(eq(lessonTeachers.lessonId, lessonId), eq(lessonTeachers.teacherId, viewer.teacherId)))
    .limit(1)).length)) {
    throwApiError(403, "FORBIDDEN", "You do not have access to this lesson");
  }
  const [record] = viewer.canViewRecords ? await db.select({
    id: lessonRecords.id,
    actualStartAt: lessonRecords.actualStartAt,
    actualEndAt: lessonRecords.actualEndAt,
    note: lessonRecords.note,
    nextContent: lessonRecords.nextContent,
    createdAt: lessonRecords.createdAt,
  }).from(lessonRecords).where(eq(lessonRecords.lessonId, lessonId)).limit(1) : [];
  return { data: toLessonResponse(lesson, await getLessonParticipants(db, lessonId), record) };
}

export async function updateLesson(
  db: Database,
  lessonId: string,
  input: UpdateLessonInput,
  viewer: LessonViewer,
) {
  const [current] = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
  if (!current) throwApiError(404, "RESOURCE_NOT_FOUND", "Lesson not found");
  if (current.status !== "scheduled") throwApiError(409, "INVALID_STATUS_TRANSITION", "Only scheduled lessons can be updated");
  await assertViewerCanManageLesson(db, lessonId, viewer);
  const currentParticipants = await getLessonParticipants(db, lessonId);
  const participants = normalizeParticipants({
    teacherIds: input.teacherIds ?? (input.teacherId ? undefined : currentParticipants.teacherIds),
    studentIds: input.studentIds ?? (input.studentId ? undefined : currentParticipants.studentIds),
    teacherId: input.teacherId,
    studentId: input.studentId,
  });
  const scheduledStartAt = input.scheduledStart ? new Date(input.scheduledStart) : current.scheduledStartAt;
  const scheduledEndAt = input.scheduledEnd ? new Date(input.scheduledEnd) : current.scheduledEndAt;
  assertDateRange(scheduledStartAt, scheduledEndAt);
  await assertActiveReferences(db, participants);
  await assertViewerCanManageParticipants(db, participants, viewer);
  await assertNoTeacherScheduleConflict(db, participants.teacherIds, scheduledStartAt, scheduledEndAt, lessonId);
  await db.batch([
    db.update(lessons).set({
      ...(input.classId === undefined ? {} : { classId: input.classId }),
      teacherId: participants.teacherIds[0], studentId: participants.studentIds[0],
      ...(input.title === undefined ? {} : { title: input.title }),
      ...(input.level === undefined ? {} : { level: input.level }),
      ...(input.scheduledStart === undefined ? {} : { scheduledStartAt }),
      ...(input.scheduledEnd === undefined ? {} : { scheduledEndAt }),
      ...(input.statusReason === undefined ? {} : { statusReason: input.statusReason }),
      updatedAt: new Date(),
    }).where(and(eq(lessons.id, lessonId), eq(lessons.status, "scheduled"))),
    db.delete(lessonTeachers).where(eq(lessonTeachers.lessonId, lessonId)),
    db.delete(lessonStudents).where(eq(lessonStudents.lessonId, lessonId)),
    db.insert(lessonTeachers).values(participants.teacherIds.map((teacherId, index) => ({
      lessonId,
      teacherId,
      role: index === 0 ? ("primary" as const) : ("assistant" as const),
    }))),
    db.insert(lessonStudents).values(participants.studentIds.map((studentId) => ({ lessonId, studentId }))),
  ]);
  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
  if (!lesson) throwApiError(409, "INVALID_STATUS_TRANSITION", "Lesson was changed by another request");
  return { data: toLessonResponse(lesson, participants) };
}

export async function cancelLesson(db: Database, lessonId: string, viewer: LessonViewer) {
  const [lesson] = await db.select({ id: lessons.id, status: lessons.status }).from(lessons)
    .where(eq(lessons.id, lessonId)).limit(1);
  if (!lesson) throwApiError(404, "RESOURCE_NOT_FOUND", "Lesson not found");
  if (lesson.status !== "scheduled") throwApiError(409, "INVALID_STATUS_TRANSITION", "Only scheduled lessons can be cancelled");
  await assertViewerCanManageLesson(db, lessonId, viewer);
  const [paymentRows] = await db.select({ count: count() }).from(paymentRecordLessons).where(eq(paymentRecordLessons.lessonId, lessonId));
  assertResourceIsNotInUse("lesson", lessonId, [
    { type: "paymentRecordLessons", count: Number(paymentRows?.count ?? 0) },
  ]);
  const [updated] = await db.update(lessons).set({ status: "cancelled", updatedAt: new Date() })
    .where(and(eq(lessons.id, lessonId), eq(lessons.status, "scheduled"))).returning({ id: lessons.id });
  if (!updated) throwApiError(409, "INVALID_STATUS_TRANSITION", "Lesson was changed by another request");
}
