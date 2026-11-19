import { and, asc, desc, eq, isNotNull, lt } from "drizzle-orm";

import type { Database } from "../../db/client.js";
import { lessons, paymentRecords, students } from "../../db/schema.js";

const NO_RECENT_LESSON_DAYS = 21;
const BIRTHDAY_WINDOW_DAYS = 30;

function dateString(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : null;
}

function startOfToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function daysBetween(from: Date, to: Date) {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86_400_000));
}

function nextBirthday(birthDate: Date, today: Date) {
  const year = today.getUTCFullYear();
  let candidate = new Date(Date.UTC(year, birthDate.getUTCMonth(), birthDate.getUTCDate()));
  if (candidate < today) candidate = new Date(Date.UTC(year + 1, birthDate.getUTCMonth(), birthDate.getUTCDate()));
  return candidate;
}

export async function getDashboardAlerts(db: Database) {
  const today = startOfToday();
  const recentThreshold = new Date(today.getTime() - NO_RECENT_LESSON_DAYS * 86_400_000);
  const birthdayThreshold = new Date(today.getTime() + BIRTHDAY_WINDOW_DAYS * 86_400_000);

  const [studentRows, completedLessons, overduePayments] = await Promise.all([
    db.select({ id: students.id, displayName: students.displayName, birthDate: students.birthDate })
      .from(students).where(eq(students.isActive, true)).orderBy(asc(students.displayName)),
    db.select({ studentId: lessons.studentId, scheduledStartAt: lessons.scheduledStartAt })
      .from(lessons).where(and(eq(lessons.status, "completed"), lt(lessons.scheduledStartAt, today)))
      .orderBy(desc(lessons.scheduledStartAt)),
    db.select({ studentId: paymentRecords.studentId, dueDate: paymentRecords.dueDate, totalAmountMinor: paymentRecords.totalAmountMinor, currency: paymentRecords.currency })
      .from(paymentRecords).where(and(eq(paymentRecords.status, "active"), eq(paymentRecords.paymentStatus, "unpaid"), isNotNull(paymentRecords.dueDate), lt(paymentRecords.dueDate, today)))
      .orderBy(asc(paymentRecords.dueDate)),
  ]);

  const studentMap = new Map(studentRows.map((student) => [student.id, student]));
  const lastLessons = new Map<string, Date>();
  for (const lesson of completedLessons) {
    if (!lastLessons.has(lesson.studentId)) lastLessons.set(lesson.studentId, lesson.scheduledStartAt);
  }

  const noRecentLessons = studentRows.flatMap((student) => {
    const lastLesson = lastLessons.get(student.id) ?? null;
    if (lastLesson && lastLesson >= recentThreshold) return [];
    return [{
      type: "no_recent_lesson" as const,
      studentId: student.id,
      studentName: student.displayName,
      lastLessonDate: dateString(lastLesson),
      daysSinceLastLesson: lastLesson ? daysBetween(lastLesson, today) : NO_RECENT_LESSON_DAYS,
    }];
  });

  const overduePaymentAlerts = overduePayments.flatMap((payment) => {
    const student = studentMap.get(payment.studentId);
    if (!student || !payment.dueDate) return [];
    return [{
      type: "overdue_payment" as const,
      studentId: student.id,
      studentName: student.displayName,
      dueDate: dateString(payment.dueDate)!,
      daysOverdue: Math.max(1, daysBetween(payment.dueDate, today)),
      totalAmountMinor: payment.totalAmountMinor,
      currency: payment.currency,
    }];
  });

  const upcomingBirthdays = studentRows.flatMap((student) => {
    if (!student.birthDate) return [];
    const birthday = nextBirthday(student.birthDate, today);
    if (birthday > birthdayThreshold) return [];
    return [{
      type: "upcoming_birthday" as const,
      studentId: student.id,
      studentName: student.displayName,
      birthDate: dateString(student.birthDate)!,
      daysUntilBirthday: daysBetween(today, birthday),
    }];
  });

  return {
    data: {
      noRecentLessons,
      overduePayments: overduePaymentAlerts,
      upcomingBirthdays,
      generatedAt: new Date().toISOString(),
    },
  };
}
