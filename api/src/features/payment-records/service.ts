import { and, asc, count, eq, inArray } from "drizzle-orm";
import type { z } from "@hono/zod-openapi";

import type { Database } from "../../db/client.js";
import {
  lessonStudents,
  lessonTypes,
  lessons,
  paymentRecordLessons,
  paymentRecordTextbooks,
  paymentRecords,
  students,
  textbooks,
  type PaymentRecord,
} from "../../db/schema.js";
import { throwApiError } from "../../shared/errors.js";
import type { CreatePaymentRecordSchema, PaymentRecordListQuerySchema, UpdatePaymentRecordSchema } from "./schema.js";

const LESSONS_PER_PAYMENT = 5;
type ListInput = z.infer<typeof PaymentRecordListQuerySchema>;
type CreateInput = z.infer<typeof CreatePaymentRecordSchema>;
type UpdateInput = z.infer<typeof UpdatePaymentRecordSchema>;

type PaymentRow = PaymentRecord & { studentName: string; className: string | null };
type TextbookRow = { paymentRecordId: string; id: string; title: string; priceMinor: number; priceMinorSnapshot: number };
type LessonRow = { paymentRecordId: string; lessonId: string };

function uniqueIds(ids: string[]) {
  return [...new Set(ids)];
}

function toResponse(row: PaymentRow, textbookRows: TextbookRow[], lessonRows: LessonRow[]) {
  const usedLessonCount = lessonRows.length;
  return {
    id: row.id,
    studentId: row.studentId,
    studentName: row.studentName,
    classId: row.classId,
    className: row.className,
    purchasedAt: row.purchasedAt.toISOString(),
    dueDate: row.dueDate?.toISOString().slice(0, 10) ?? null,
    lessonCount: 5 as const,
    usedLessonCount,
    remainingLessons: Math.max(LESSONS_PER_PAYMENT - usedLessonCount, 0),
    lessonAmountMinor: row.lessonAmountMinor,
    textbookAmountMinor: row.textbookAmountMinor,
    totalAmountMinor: row.totalAmountMinor,
    currency: row.currency,
    status: row.status,
    paymentStatus: row.paymentStatus,
    textbooks: textbookRows.map((textbook) => ({
      id: textbook.id,
      title: textbook.title,
      priceMinor: textbook.priceMinor,
      priceMinorSnapshot: textbook.priceMinorSnapshot,
    })),
    lessonIds: lessonRows.map((lesson) => lesson.lessonId),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getRows(db: Database, paymentRecordIds?: string[]) {
  const where = paymentRecordIds ? inArray(paymentRecords.id, paymentRecordIds) : undefined;
  const rows = await db.select({
    record: paymentRecords,
    studentName: students.displayName,
    className: lessonTypes.name,
  }).from(paymentRecords)
    .innerJoin(students, eq(students.id, paymentRecords.studentId))
    .leftJoin(lessonTypes, eq(lessonTypes.id, paymentRecords.classId))
    .where(where)
    .orderBy(asc(paymentRecords.purchasedAt), asc(paymentRecords.id));
  const ids = rows.map((row) => row.record.id);
  if (ids.length === 0) return [];

  const [textbookRows, lessonRows] = await Promise.all([
    db.select({ paymentRecordId: paymentRecordTextbooks.paymentRecordId, id: textbooks.id, title: textbooks.title, priceMinor: textbooks.priceMinor, priceMinorSnapshot: paymentRecordTextbooks.priceMinorSnapshot })
      .from(paymentRecordTextbooks).innerJoin(textbooks, eq(textbooks.id, paymentRecordTextbooks.textbookId)).where(inArray(paymentRecordTextbooks.paymentRecordId, ids)),
    db.select({ paymentRecordId: paymentRecordLessons.paymentRecordId, lessonId: paymentRecordLessons.lessonId })
      .from(paymentRecordLessons).where(inArray(paymentRecordLessons.paymentRecordId, ids)),
  ]);
  const textbooksByRecord = new Map<string, TextbookRow[]>();
  for (const row of textbookRows) textbooksByRecord.set(row.paymentRecordId, [...(textbooksByRecord.get(row.paymentRecordId) ?? []), row]);
  const lessonsByRecord = new Map<string, LessonRow[]>();
  for (const row of lessonRows) lessonsByRecord.set(row.paymentRecordId, [...(lessonsByRecord.get(row.paymentRecordId) ?? []), row]);

  return rows.map((row) => toResponse(
    { ...row.record, studentName: row.studentName, className: row.className },
    textbooksByRecord.get(row.record.id) ?? [],
    lessonsByRecord.get(row.record.id) ?? [],
  ));
}

async function getReferenceData(db: Database, input: { classId: string; textbookIds: string[] }) {
  const [lessonType, textbookRows] = await Promise.all([
    db.select().from(lessonTypes).where(eq(lessonTypes.id, input.classId)).limit(1),
    input.textbookIds.length === 0 ? Promise.resolve([]) : db.select().from(textbooks).where(inArray(textbooks.id, input.textbookIds)),
  ]);
  if (!lessonType[0]) throwApiError(404, "RESOURCE_NOT_FOUND", "Class not found");
  if (textbookRows.length !== input.textbookIds.length) throwApiError(404, "RESOURCE_NOT_FOUND", "One or more textbooks were not found");
  if (textbookRows.some((textbook) => textbook.currency !== lessonType[0].currency)) {
    throwApiError(400, "VALIDATION_ERROR", "Class and textbooks must use the same currency");
  }
  return { lessonType: lessonType[0], textbooks: textbookRows };
}

async function validateLessons(db: Database, studentId: string, lessonIds: string[]) {
  const ids = uniqueIds(lessonIds);
  if (ids.length > LESSONS_PER_PAYMENT) throwApiError(400, "VALIDATION_ERROR", "A payment record can contain at most five lessons");
  if (ids.length === 0) return ids;
  const rows = await db.select({ lessonId: lessonStudents.lessonId }).from(lessonStudents)
    .innerJoin(lessons, eq(lessons.id, lessonStudents.lessonId))
    .where(and(inArray(lessonStudents.lessonId, ids), eq(lessonStudents.studentId, studentId), eq(lessons.status, "completed")));
  if (rows.length !== ids.length) throwApiError(400, "VALIDATION_ERROR", "All lessons must be completed lessons for the student");
  return ids;
}

function getUsageStatus(lessonCount: number, requestedStatus?: UpdateInput["status"]) {
  if (requestedStatus === "cancelled" || requestedStatus === "expired") return requestedStatus;
  return lessonCount >= LESSONS_PER_PAYMENT ? "used_up" : "active";
}

export async function listPaymentRecords(db: Database, input: ListInput) {
  const conditions = [
    input.studentId ? eq(paymentRecords.studentId, input.studentId) : undefined,
    input.status ? eq(paymentRecords.status, input.status) : undefined,
    input.paymentStatus ? eq(paymentRecords.paymentStatus, input.paymentStatus) : undefined,
  ].filter((condition): condition is NonNullable<typeof condition> => Boolean(condition));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (input.page - 1) * input.pageSize;
  const [rows, totalResult] = await Promise.all([
    db.select({ id: paymentRecords.id }).from(paymentRecords).where(where).orderBy(asc(paymentRecords.purchasedAt), asc(paymentRecords.id)).limit(input.pageSize).offset(offset),
    db.select({ total: count() }).from(paymentRecords).where(where),
  ]);
  const data = await getRows(db, rows.map((row) => row.id));
  const total = Number(totalResult[0]?.total ?? 0);
  return { data, meta: { page: input.page, pageSize: input.pageSize, total, totalPages: total === 0 ? 0 : Math.ceil(total / input.pageSize) } };
}

export async function getPaymentRecord(db: Database, paymentRecordId: string) {
  const [record] = await getRows(db, [paymentRecordId]);
  if (!record) throwApiError(404, "RESOURCE_NOT_FOUND", "Payment record not found");
  return { data: record };
}

export async function createPaymentRecord(db: Database, input: CreateInput) {
  const textbookIds = uniqueIds(input.textbookIds);
  const { lessonType, textbooks: textbookRows } = await getReferenceData(db, { classId: input.classId, textbookIds });
  const [student] = await db.select({ id: students.id }).from(students).where(eq(students.id, input.studentId)).limit(1);
  if (!student) throwApiError(404, "RESOURCE_NOT_FOUND", "Student not found");
  const lessonIds = await validateLessons(db, input.studentId, input.lessonIds);
  const textbookAmountMinor = textbookRows.reduce((total, textbook) => total + textbook.priceMinor, 0);
  const lessonAmountMinor = lessonType.priceMinor * LESSONS_PER_PAYMENT;
  const paymentRecordId = crypto.randomUUID();
  await db.batch([
    db.insert(paymentRecords).values({
      id: paymentRecordId,
      studentId: input.studentId, classId: input.classId, purchasedAt: new Date(input.purchasedAt), dueDate: input.dueDate ? new Date(`${input.dueDate}T00:00:00`) : null,
      lessonAmountMinor, textbookAmountMinor, totalAmountMinor: lessonAmountMinor + textbookAmountMinor,
      currency: lessonType.currency, paymentStatus: input.paymentStatus, status: getUsageStatus(lessonIds.length),
    }),
    ...(textbookRows.length > 0
      ? [db.insert(paymentRecordTextbooks).values(textbookRows.map((textbook) => ({ paymentRecordId, textbookId: textbook.id, priceMinorSnapshot: textbook.priceMinor })))]
      : []),
    ...(lessonIds.length > 0
      ? [db.insert(paymentRecordLessons).values(lessonIds.map((lessonId) => ({ paymentRecordId, lessonId })))]
      : []),
  ]);
  return getPaymentRecord(db, paymentRecordId);
}

export async function updatePaymentRecord(db: Database, paymentRecordId: string, input: UpdateInput) {
  const current = await getPaymentRecord(db, paymentRecordId);
  const currentData = current.data;
  const classId = input.classId ?? currentData.classId;
  if (!classId) throwApiError(400, "VALIDATION_ERROR", "classId is required");
  const textbookIds = input.textbookIds ?? currentData.textbooks.map((textbook) => textbook.id);
  const { lessonType, textbooks: textbookRows } = await getReferenceData(db, { classId, textbookIds: uniqueIds(textbookIds) });
  const lessonIds = await validateLessons(db, currentData.studentId, input.lessonIds ?? currentData.lessonIds);
  const textbookAmountMinor = textbookRows.reduce((total, textbook) => total + textbook.priceMinor, 0);
  const lessonAmountMinor = lessonType.priceMinor * LESSONS_PER_PAYMENT;
  await db.batch([
    db.update(paymentRecords).set({
      classId,
      purchasedAt: input.purchasedAt ? new Date(input.purchasedAt) : undefined,
      dueDate: input.dueDate === undefined ? undefined : input.dueDate ? new Date(`${input.dueDate}T00:00:00`) : null,
      lessonAmountMinor,
      textbookAmountMinor,
      totalAmountMinor: lessonAmountMinor + textbookAmountMinor,
      currency: lessonType.currency,
      status: getUsageStatus(lessonIds.length, input.status),
      paymentStatus: input.paymentStatus,
      updatedAt: new Date(),
    }).where(eq(paymentRecords.id, paymentRecordId)),
    db.delete(paymentRecordTextbooks).where(eq(paymentRecordTextbooks.paymentRecordId, paymentRecordId)),
    db.delete(paymentRecordLessons).where(eq(paymentRecordLessons.paymentRecordId, paymentRecordId)),
    ...(textbookRows.length > 0
      ? [db.insert(paymentRecordTextbooks).values(textbookRows.map((textbook) => ({ paymentRecordId, textbookId: textbook.id, priceMinorSnapshot: textbook.priceMinor })))]
      : []),
    ...(lessonIds.length > 0
      ? [db.insert(paymentRecordLessons).values(lessonIds.map((lessonId) => ({ paymentRecordId, lessonId })))]
      : []),
  ]);
  return getPaymentRecord(db, paymentRecordId);
}

export async function cancelPaymentRecord(db: Database, paymentRecordId: string) {
  const [record] = await db.update(paymentRecords).set({ status: "cancelled", updatedAt: new Date() }).where(eq(paymentRecords.id, paymentRecordId)).returning({ id: paymentRecords.id });
  if (!record) throwApiError(404, "RESOURCE_NOT_FOUND", "Payment record not found");
}
