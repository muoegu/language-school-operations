import { and, asc, count, eq, ilike, inArray, or, sql } from "drizzle-orm";

import type { Database } from "../../db/client.js";
import { classes, lessonStudents, lessons, paymentRecords, students, teacherStudentAssignments, type Student } from "../../db/schema.js";
import { throwApiError } from "../../shared/errors.js";
import { assertResourceIsNotInUse } from "../../shared/resource-dependencies.js";
import type {
  CreateStudentSchema,
  StudentListQuerySchema,
  UpdateStudentSchema,
} from "./schema.js";
import type { z } from "@hono/zod-openapi";

type CreateStudentInput = z.infer<typeof CreateStudentSchema>;
type ListStudentInput = z.infer<typeof StudentListQuerySchema>;
type UpdateStudentInput = z.infer<typeof UpdateStudentSchema>;

type StudentWithClass = Student & { className?: string | null };

export const toStudentResponse = (student: StudentWithClass) => ({
  id: student.id,
  displayName: student.displayName,
  email: student.email,
  birthDate: student.birthDate?.toISOString().slice(0, 10) ?? null,
  level: student.level,
  classId: student.classId,
  className: student.className ?? null,
  isActive: student.isActive,
  createdAt: student.createdAt.toISOString(),
  updatedAt: student.updatedAt.toISOString(),
});

export async function listStudents(db: Database, input: ListStudentInput, viewer?: { teacherId?: string; canViewAll: boolean }) {
  const conditions = [eq(students.isActive, input.active !== "false")];

  if (viewer && !viewer.canViewAll) {
    if (!viewer.teacherId) throwApiError(403, "FORBIDDEN", "You do not have access to students");
    const assignments = await db.select({ studentId: teacherStudentAssignments.studentId })
      .from(teacherStudentAssignments)
      .where(and(
        eq(teacherStudentAssignments.teacherId, viewer.teacherId),
        eq(teacherStudentAssignments.isActive, true),
      ));
    const assignedStudentIds = assignments.map((assignment) => assignment.studentId);
    if (assignedStudentIds.length === 0) {
      return {
        data: [],
        meta: { page: input.page, pageSize: input.pageSize, total: 0, totalPages: 0 },
      };
    }
    conditions.push(inArray(students.id, assignedStudentIds));
  }

  if (input.q) {
    const pattern = `%${input.q}%`;
    conditions.push(
      or(ilike(students.displayName, pattern), ilike(students.email, pattern))!,
    );
  }

  const where = and(...conditions);
  const offset = (input.page - 1) * input.pageSize;
  const [data, totalResult] = await Promise.all([
    db
      .select({ student: students, className: classes.name })
      .from(students)
      .leftJoin(classes, eq(classes.id, students.classId))
      .where(where)
      .orderBy(asc(students.displayName), asc(students.id))
      .limit(input.pageSize)
      .offset(offset),
    db.select({ total: count() }).from(students).where(where),
  ]);
  const total = Number(totalResult[0]?.total ?? 0);

  return {
    data: data.map(({ student, className }) => toStudentResponse({ ...student, className })),
    meta: {
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / input.pageSize),
    },
  };
}

export async function getStudent(db: Database, studentId: string, viewer?: { teacherId?: string; canViewAll: boolean }) {
  if (viewer && !viewer.canViewAll) {
    if (!viewer.teacherId) throwApiError(403, "FORBIDDEN", "You do not have access to this student");
    const [assignment] = await db.select({ id: teacherStudentAssignments.id })
      .from(teacherStudentAssignments)
      .where(and(
        eq(teacherStudentAssignments.teacherId, viewer.teacherId),
        eq(teacherStudentAssignments.studentId, studentId),
        eq(teacherStudentAssignments.isActive, true),
      )).limit(1);
    if (!assignment) throwApiError(403, "FORBIDDEN", "You do not have access to this student");
  }
  const [student] = await db
    .select({ student: students, className: classes.name })
    .from(students)
    .leftJoin(classes, eq(classes.id, students.classId))
    .where(eq(students.id, studentId))
    .limit(1);

  if (!student) {
    throwApiError(404, "RESOURCE_NOT_FOUND", "Student not found");
  }

  return { data: toStudentResponse({ ...student.student, className: student.className }) };
}

async function assertClassIsAvailable(db: Database, classId: string | null | undefined) {
  if (!classId) return;
  const [classRecord] = await db.select({ id: classes.id }).from(classes)
    .where(and(eq(classes.id, classId), eq(classes.isActive, true))).limit(1);
  if (!classRecord) throwApiError(400, "VALIDATION_ERROR", "Active class not found");
}

async function assertEmailIsAvailable(db: Database, email: string | null | undefined, studentId?: string) {
  if (!email) return;

  const [existing] = await db
    .select({ id: students.id })
    .from(students)
    .where(
      studentId
        ? and(eq(students.email, email), sql`${students.id} <> ${studentId}`)
        : eq(students.email, email),
    )
    .limit(1);

  if (existing) {
    throwApiError(409, "DUPLICATE_RESOURCE", "Email already exists");
  }
}

export async function createStudent(db: Database, input: CreateStudentInput) {
  await assertEmailIsAvailable(db, input.email);
  await assertClassIsAvailable(db, input.classId);
  const [student] = await db
    .insert(students)
    .values({
      displayName: input.displayName,
      email: input.email ?? null,
      level: input.level ?? null,
      classId: input.classId ?? null,
    })
    .returning();

  return getStudent(db, student.id);
}

export async function updateStudent(db: Database, studentId: string, input: UpdateStudentInput) {
  await assertEmailIsAvailable(db, input.email, studentId);
  await assertClassIsAvailable(db, input.classId);
  const [student] = await db
    .update(students)
    .set({
      ...(input.displayName === undefined ? {} : { displayName: input.displayName }),
      ...(input.email === undefined ? {} : { email: input.email }),
      ...(input.level === undefined ? {} : { level: input.level }),
      ...(input.classId === undefined ? {} : { classId: input.classId }),
      ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
      updatedAt: new Date(),
    })
    .where(eq(students.id, studentId))
    .returning();

  if (!student) {
    throwApiError(404, "RESOURCE_NOT_FOUND", "Student not found");
  }

  return getStudent(db, student.id);
}

export async function deactivateStudent(db: Database, studentId: string) {
  const [lessonRows, lessonStudentRows, assignmentRows, paymentRows] = await Promise.all([
    db.select({ count: count() }).from(lessons).where(eq(lessons.studentId, studentId)),
    db.select({ count: count() }).from(lessonStudents).where(eq(lessonStudents.studentId, studentId)),
    db.select({ count: count() }).from(teacherStudentAssignments).where(eq(teacherStudentAssignments.studentId, studentId)),
    db.select({ count: count() }).from(paymentRecords).where(eq(paymentRecords.studentId, studentId)),
  ]);
  assertResourceIsNotInUse("student", studentId, [
    { type: "lessons", count: Number(lessonRows[0]?.count ?? 0) },
    { type: "lessonStudents", count: Number(lessonStudentRows[0]?.count ?? 0) },
    { type: "teacherStudentAssignments", count: Number(assignmentRows[0]?.count ?? 0) },
    { type: "paymentRecords", count: Number(paymentRows[0]?.count ?? 0) },
  ]);
  const [student] = await db
    .update(students)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(students.id, studentId))
    .returning({ id: students.id });

  if (!student) {
    throwApiError(404, "RESOURCE_NOT_FOUND", "Student not found");
  }
}
