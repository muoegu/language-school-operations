import { and, asc, count, eq, ilike, or, sql } from "drizzle-orm";
import type { z } from "@hono/zod-openapi";

import type { Database } from "../../db/client.js";
import { lessonTeachers, lessons, teacherStudentAssignments, teachers, type Teacher } from "../../db/schema.js";
import { throwApiError } from "../../shared/errors.js";
import { assertResourceIsNotInUse } from "../../shared/resource-dependencies.js";
import type {
  CreateTeacherSchema,
  TeacherListQuerySchema,
  UpdateTeacherSchema,
} from "./schema.js";

type CreateTeacherInput = z.infer<typeof CreateTeacherSchema>;
type ListTeacherInput = z.infer<typeof TeacherListQuerySchema>;
type UpdateTeacherInput = z.infer<typeof UpdateTeacherSchema>;

export const toTeacherResponse = (teacher: Teacher) => ({
  id: teacher.id,
  displayName: teacher.displayName,
  email: teacher.email,
  employmentStartDate: teacher.employmentStartDate,
  employmentEndDate: teacher.employmentEndDate,
  isActive: teacher.isActive,
  createdAt: teacher.createdAt.toISOString(),
  updatedAt: teacher.updatedAt.toISOString(),
});

export async function listTeachers(db: Database, input: ListTeacherInput) {
  const conditions = [eq(teachers.isActive, input.active !== "false")];

  if (input.q) {
    const pattern = `%${input.q}%`;
    conditions.push(
      or(ilike(teachers.displayName, pattern), ilike(teachers.email, pattern))!,
    );
  }

  const where = and(...conditions);
  const offset = (input.page - 1) * input.pageSize;
  const [data, totalResult] = await Promise.all([
    db
      .select()
      .from(teachers)
      .where(where)
      .orderBy(asc(teachers.displayName), asc(teachers.id))
      .limit(input.pageSize)
      .offset(offset),
    db.select({ total: count() }).from(teachers).where(where),
  ]);
  const total = Number(totalResult[0]?.total ?? 0);

  return {
    data: data.map(toTeacherResponse),
    meta: {
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / input.pageSize),
    },
  };
}

export async function getTeacher(db: Database, teacherId: string) {
  const [teacher] = await db
    .select()
    .from(teachers)
    .where(eq(teachers.id, teacherId))
    .limit(1);

  if (!teacher) {
    throwApiError(404, "RESOURCE_NOT_FOUND", "Teacher not found");
  }

  return { data: toTeacherResponse(teacher) };
}

async function assertEmailIsAvailable(db: Database, email: string | null | undefined, teacherId?: string) {
  if (!email) return;

  const [existing] = await db
    .select({ id: teachers.id })
    .from(teachers)
    .where(
      teacherId
        ? and(eq(teachers.email, email), sql`${teachers.id} <> ${teacherId}`)
        : eq(teachers.email, email),
    )
    .limit(1);

  if (existing) {
    throwApiError(409, "DUPLICATE_RESOURCE", "Email already exists");
  }
}

export async function createTeacher(db: Database, input: CreateTeacherInput) {
  await assertEmailIsAvailable(db, input.email);
  const [teacher] = await db
    .insert(teachers)
    .values({
      displayName: input.displayName,
      email: input.email ?? null,
      employmentStartDate: input.employmentStartDate,
      employmentEndDate: input.employmentEndDate ?? null,
    })
    .returning();

  return { data: toTeacherResponse(teacher) };
}

export async function updateTeacher(db: Database, teacherId: string, input: UpdateTeacherInput) {
  await assertEmailIsAvailable(db, input.email, teacherId);
  const [teacher] = await db
    .update(teachers)
    .set({
      ...(input.displayName === undefined ? {} : { displayName: input.displayName }),
      ...(input.email === undefined ? {} : { email: input.email }),
      ...(input.employmentStartDate === undefined ? {} : { employmentStartDate: input.employmentStartDate }),
      ...(input.employmentEndDate === undefined ? {} : { employmentEndDate: input.employmentEndDate }),
      ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
      updatedAt: new Date(),
    })
    .where(eq(teachers.id, teacherId))
    .returning();

  if (!teacher) {
    throwApiError(404, "RESOURCE_NOT_FOUND", "Teacher not found");
  }

  return { data: toTeacherResponse(teacher) };
}

export async function deactivateTeacher(db: Database, teacherId: string) {
  const [lessonRows, lessonTeacherRows, assignmentRows] = await Promise.all([
    db.select({ count: count() }).from(lessons).where(eq(lessons.teacherId, teacherId)),
    db.select({ count: count() }).from(lessonTeachers).where(eq(lessonTeachers.teacherId, teacherId)),
    db.select({ count: count() }).from(teacherStudentAssignments).where(eq(teacherStudentAssignments.teacherId, teacherId)),
  ]);
  assertResourceIsNotInUse("teacher", teacherId, [
    { type: "lessons", count: Number(lessonRows[0]?.count ?? 0) },
    { type: "lessonTeachers", count: Number(lessonTeacherRows[0]?.count ?? 0) },
    { type: "teacherStudentAssignments", count: Number(assignmentRows[0]?.count ?? 0) },
  ]);
  const [teacher] = await db
    .update(teachers)
    .set({ isActive: false, employmentEndDate: new Date().toISOString().slice(0, 10), updatedAt: new Date() })
    .where(eq(teachers.id, teacherId))
    .returning({ id: teachers.id });

  if (!teacher) {
    throwApiError(404, "RESOURCE_NOT_FOUND", "Teacher not found");
  }
}
