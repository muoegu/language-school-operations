import "../config/load-env.js";

import { getDb } from "./client.js";
import {
  attendanceRecords,
  lessonRecords,
  lessonStudents,
  lessonTeachers,
  lessonTypes,
  lessons,
  paymentRecordLessons,
  paymentRecordTextbooks,
  paymentRecords,
  staffMembers,
  students,
  textbooks,
  teacherStudentAssignments,
  teachers,
  userRoles,
  users,
} from "./schema.js";
import { and, eq } from "drizzle-orm";

const databaseUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL_UNPOOLED or DATABASE_URL is required to seed the database");
}

const db = getDb({ DATABASE_URL: databaseUrl });

const seedLessonTypes = [
  { name: "マンツーマン会話 60分", level: "全レベル", durationMinutes: 60, priceMinor: 4500 },
  { name: "マンツーマン会話 90分", level: "全レベル", durationMinutes: 90, priceMinor: 6200 },
  { name: "ビジネス日本語", level: "中級以上", durationMinutes: 60, priceMinor: 5200 },
  { name: "試験対策レッスン", level: "中級以上", durationMinutes: 90, priceMinor: 6800 },
  { name: "発音・会話集中", level: "初級以上", durationMinutes: 45, priceMinor: 3600 },
];

const seedTextbooks = [
  { title: "みんなの日本語 初級I", publisher: "スリーエーネットワーク", priceMinor: 2750, status: "selling" as const },
  { title: "中級から学ぶ日本語", publisher: "研究社", priceMinor: 3080, status: "selling" as const },
  { title: "ニュースで学ぶ日本語", publisher: "ポートフォリオ出版", priceMinor: 2200, status: "discontinued" as const },
  { title: "ビジネス日本語ワークブック", publisher: "語学教育社", priceMinor: 1980, status: "selling" as const },
  { title: "日本語発音トレーニング", publisher: "学習教材出版", priceMinor: 1650, status: "selling" as const },
];

await db.insert(lessonTypes).values(seedLessonTypes).onConflictDoNothing();
await db.insert(textbooks).values(seedTextbooks).onConflictDoNothing();

const seededLessonTypes = await db.select({ id: lessonTypes.id, name: lessonTypes.name, priceMinor: lessonTypes.priceMinor }).from(lessonTypes);
const lessonTypesByName = new Map(seededLessonTypes.map((lessonType) => [lessonType.name, lessonType]));
const seededTextbooks = await db.select({ id: textbooks.id, title: textbooks.title, priceMinor: textbooks.priceMinor }).from(textbooks);
const textbooksByTitle = new Map(seededTextbooks.map((textbook) => [textbook.title, textbook]));

const seedTeachers = [
  { displayName: "田中 愛子", email: "aiko.tanaka@example.test", employmentStartDate: "2024-04-01" },
  { displayName: "佐藤 健一", email: "wei.chen@example.test", employmentStartDate: "2025-10-01" },
];

const seedStudents = [
  { displayName: "林 美奈", email: "mina.lin@example.test", level: "初級" },
  { displayName: "森 裕樹", email: "yuki.mori@example.test", level: "中級" },
  { displayName: "黄 潤", email: "jun.huang@example.test", level: "上級" },
  { displayName: "王 恵", email: "emma.wang@example.test", level: "初級" },
  { displayName: "中村 玲", email: "leo.nakamura@example.test", level: "中級" },
];

await db.insert(teachers).values(seedTeachers).onConflictDoNothing();
await db.insert(students).values(seedStudents).onConflictDoNothing();

const seededTeachers = await db
  .select({ id: teachers.id, email: teachers.email, displayName: teachers.displayName })
  .from(teachers);
const seededStudents = await db
  .select({ id: students.id, email: students.email })
  .from(students);

const studentClassesByEmail = new Map([
  ["mina.lin@example.test", "マンツーマン会話 60分"],
  ["yuki.mori@example.test", "マンツーマン会話 90分"],
  ["jun.huang@example.test", "ビジネス日本語"],
  ["emma.wang@example.test", "試験対策レッスン"],
  ["leo.nakamura@example.test", "発音・会話集中"],
]);

for (const student of seededStudents) {
  if (!student.email) continue;
  const className = studentClassesByEmail.get(student.email);
  const classId = className ? lessonTypesByName.get(className)?.id : undefined;
  if (!classId) continue;
  await db.update(students)
    .set({ classId, updatedAt: new Date() })
    .where(eq(students.id, student.id));
}

const seedBirthDates = new Map([
  ["mina.lin@example.test", "1995-11-21"],
  ["yuki.mori@example.test", "1992-12-01"],
  ["jun.huang@example.test", "1988-12-20"],
  ["emma.wang@example.test", "1998-06-15"],
  ["leo.nakamura@example.test", "1990-03-08"],
]);

for (const student of seededStudents) {
  if (!student.email) continue;
  const birthDate = seedBirthDates.get(student.email);
  if (!birthDate) continue;
  await db.update(students)
    .set({ birthDate: new Date(`${birthDate}T00:00:00`), updatedAt: new Date() })
    .where(eq(students.id, student.id));
}

const teacherRoles = new Map<string, "representative" | "teacher">([
  ["aiko.tanaka@example.test", "teacher"],
  ["wei.chen@example.test", "teacher"],
]);

for (const teacher of seededTeachers) {
  if (!teacher.email) continue;
  const [user] = await db
    .insert(users)
    .values({
      email: teacher.email,
      displayName: teacher.displayName,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: { updatedAt: new Date() },
    })
    .returning({ id: users.id });

  if (!user) continue;
  await db.insert(userRoles).values({
    userId: user.id,
    role: teacherRoles.get(teacher.email) ?? "teacher",
  }).onConflictDoUpdate({
    target: userRoles.userId,
    set: { role: teacherRoles.get(teacher.email) ?? "teacher", updatedAt: new Date() },
  });
  await db
    .update(teachers)
    .set({ userId: user.id, updatedAt: new Date() })
    .where(eq(teachers.id, teacher.id));
}

const seedOperationsUsers = [
  { email: "representative@example.test", displayName: "代表", role: "representative" as const },
  { email: "staff@example.test", displayName: "事務スタッフ", role: "staff" as const },
  { email: "staff2@example.test", displayName: "受付スタッフ", role: "staff" as const },
];

for (const operationUser of seedOperationsUsers) {
  const [user] = await db
    .insert(users)
    .values({ email: operationUser.email, displayName: operationUser.displayName })
    .onConflictDoUpdate({ target: users.email, set: { updatedAt: new Date() } })
    .returning({ id: users.id });
  if (!user) continue;

  await db.insert(userRoles).values({ userId: user.id, role: operationUser.role }).onConflictDoUpdate({
    target: userRoles.userId,
    set: { role: operationUser.role, updatedAt: new Date() },
  });
  if (operationUser.role === "staff") {
    await db.insert(staffMembers).values({ userId: user.id, displayName: operationUser.displayName })
      .onConflictDoNothing();
  }
}

const seededUsersByEmail = new Map(
  (await db.select({ id: users.id, email: users.email }).from(users))
    .filter((user): user is { id: string; email: string } => Boolean(user.email))
    .map((user) => [user.email, user.id]),
);

const seedAttendance = [
  ["aiko.tanaka@example.test", "2026-11-18", "2026-11-18T09:45:00+08:00", "2026-11-18T18:00:00+08:00", "present", "通常勤務"],
  ["wei.chen@example.test", "2026-11-18", "2026-11-18T10:05:00+08:00", "2026-11-18T19:00:00+08:00", "late", "交通機関の遅延"],
  ["aiko.tanaka@example.test", "2026-11-17", "2026-11-17T09:30:00+08:00", "2026-11-17T17:30:00+08:00", "present", "通常勤務"],
  ["wei.chen@example.test", "2026-11-17", null, null, "absent", "休暇"],
  ["representative@example.test", "2026-11-18", "2026-11-18T09:00:00+08:00", "2026-11-18T18:00:00+08:00", "present", "管理部勤務"],
] as const;

for (const [email, attendanceDate, clockInAt, clockOutAt, status, note] of seedAttendance) {
  const userId = seededUsersByEmail.get(email);
  if (!userId) continue;
  await db.insert(attendanceRecords).values({
    userId,
    attendanceDate: new Date(`${attendanceDate}T00:00:00`),
    clockInAt: clockInAt ? new Date(clockInAt) : null,
    clockOutAt: clockOutAt ? new Date(clockOutAt) : null,
    status,
    note,
  }).onConflictDoNothing({ target: [attendanceRecords.userId, attendanceRecords.attendanceDate] });
}

const teachersByEmail = new Map(seededTeachers.map((teacher) => [teacher.email, teacher.id]));
const studentsByEmail = new Map(seededStudents.map((student) => [student.email, student.id]));
const seedAssignments = [
  ["aiko.tanaka@example.test", "mina.lin@example.test"],
  ["wei.chen@example.test", "yuki.mori@example.test"],
  ["aiko.tanaka@example.test", "jun.huang@example.test"],
  ["wei.chen@example.test", "emma.wang@example.test"],
  ["aiko.tanaka@example.test", "leo.nakamura@example.test"],
] as const;

for (const [teacherEmail, studentEmail] of seedAssignments) {
  const teacherId = teachersByEmail.get(teacherEmail);
  const studentId = studentsByEmail.get(studentEmail);
  if (!teacherId || !studentId) continue;

  await db
    .insert(teacherStudentAssignments)
    .values({ teacherId, studentId })
    .onConflictDoNothing();
}

const seedLessons = [
  ["aiko.tanaka@example.test", "mina.lin@example.test", "初級会話：自己紹介と日常表現", "初級", "マンツーマン会話 60分", "2026-11-04T10:00:00+08:00", "2026-11-04T11:00:00+08:00", "自己紹介と家族についての会話を練習。発音は安定してきている。", "日常生活の動詞と、昨日の出来事を話す練習。"],
  ["wei.chen@example.test", "yuki.mori@example.test", "中級会話：旅行の計画", "中級", "マンツーマン会話 90分", "2026-11-06T14:00:00+08:00", "2026-11-06T15:00:00+08:00", "旅行日程の説明と、ホテルでの依頼表現を確認した。", "交通機関の案内を聞き取る練習。"],
  ["aiko.tanaka@example.test", "jun.huang@example.test", "上級会話：ニュースディスカッション", "上級", "ビジネス日本語", "2026-11-10T19:00:00+08:00", "2026-11-10T20:30:00+08:00", "ニュース記事の要約後、賛成・反対の意見を整理して発表した。", "記事の背景を調べ、根拠を添えて意見を述べる。"],
  ["wei.chen@example.test", "emma.wang@example.test", "初級文法：過去形の復習", "初級", "発音・会話集中", "2026-11-12T09:30:00+08:00", "2026-11-12T10:30:00+08:00", "過去形の肯定文・否定文を練習。会話では語尾の発音を意識する。", "過去形を使った短い日記を作成する。"],
  ["aiko.tanaka@example.test", "leo.nakamura@example.test", "中級読解：短編記事の要約", "中級", "試験対策レッスン", "2026-11-16T16:00:00+08:00", "2026-11-16T17:00:00+08:00", "短編記事の主題と要点を日本語でまとめた。語彙の定着も良好。", "接続詞を使って段落をつなぐ練習。"],
] as const;

const lessonDistribution = [
  { month: 8, count: 5 },
  { month: 9, count: 10 },
  { month: 10, count: 10 },
  { month: 11, count: 20 },
  { month: 12, count: 5 },
];

const lessonTemplates = [
  ["aiko.tanaka@example.test", "mina.lin@example.test", "初級会話", "初級", "マンツーマン会話 60分"],
  ["wei.chen@example.test", "yuki.mori@example.test", "中級会話", "中級", "マンツーマン会話 90分"],
  ["aiko.tanaka@example.test", "jun.huang@example.test", "上級会話", "上級", "ビジネス日本語"],
  ["wei.chen@example.test", "emma.wang@example.test", "初級文法", "初級", "発音・会話集中"],
  ["aiko.tanaka@example.test", "leo.nakamura@example.test", "中級読解", "中級", "試験対策レッスン"],
] as const;

const generatedLessons = lessonDistribution.flatMap(({ month, count }) => {
  const startIndex = month === 11 ? seedLessons.length : 0;
  return Array.from({ length: count }, (_, index) => {
    if (month === 11 && index < startIndex) return null;
    const template = lessonTemplates[(index + month) % lessonTemplates.length];
    const day = 2 + index;
    const hour = 9 + ((index * 2) % 10);
    const date = `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return [
      template[0], template[1], `${template[2]}：${month}月第${index + 1}回`, template[3], template[4],
      `${date}T${String(hour).padStart(2, "0")}:00:00+08:00`,
      `${date}T${String(hour + 1).padStart(2, "0")}:00:00+08:00`,
      `${month}月の授業記録です。会話と理解度を確認しました。`,
      "次回は今回の内容を使った応用練習を行います。",
    ] as const;
  }).filter((lesson): lesson is NonNullable<typeof lesson> => lesson !== null);
});

const allSeedLessons = [...seedLessons, ...generatedLessons];

// デモ画面で、講師ごとに「未入力の授業記録」と「次回内容の準備」を確認できるようにする。
const lessonsWithoutRecord = new Set([
  "初級会話：自己紹介と日常表現",
  "中級会話：旅行の計画",
]);
const lessonsWithoutNextContent = new Set([
  "上級会話：ニュースディスカッション",
  "初級文法：過去形の復習",
]);

for (const [teacherEmail, studentEmail, title, level, lessonTypeName, scheduledStart, scheduledEnd, note, nextContent] of allSeedLessons) {
  const teacherId = teachersByEmail.get(teacherEmail);
  const studentId = studentsByEmail.get(studentEmail);
  const lessonType = lessonTypesByName.get(lessonTypeName);
  const recordedByUserId = seededUsersByEmail.get(teacherEmail);
  if (!teacherId || !studentId || !lessonType || !recordedByUserId) continue;

  const existing = await db.select({ id: lessons.id }).from(lessons).where(eq(lessons.title, title)).limit(1);
  const lesson = existing[0]
    ? (await db.select().from(lessons).where(eq(lessons.id, existing[0].id)).limit(1))[0]
    : (await db.insert(lessons).values({
        teacherId, studentId, classId: lessonType.id, title, level,
        scheduledStartAt: new Date(scheduledStart),
        scheduledEndAt: new Date(scheduledEnd),
        status: "completed",
      }).returning())[0];
  if (!lesson) continue;

  await db.update(lessons).set({ classId: lessonType.id, updatedAt: new Date() }).where(eq(lessons.id, lesson.id));
  await db.insert(lessonTeachers).values({ lessonId: lesson.id, teacherId }).onConflictDoNothing();
  await db.insert(lessonStudents).values({ lessonId: lesson.id, studentId, participationStatus: "attended" }).onConflictDoNothing();
  await db.update(lessons).set({ status: "completed", updatedAt: new Date() }).where(eq(lessons.id, lesson.id));
  if (!lessonsWithoutRecord.has(title)) {
    await db.insert(lessonRecords).values({
      lessonId: lesson.id,
      actualStartAt: new Date(scheduledStart),
      actualEndAt: new Date(scheduledEnd),
      note,
      nextContent: lessonsWithoutNextContent.has(title) ? null : nextContent,
      recordedByUserId,
      completedAt: new Date(scheduledEnd),
    }).onConflictDoNothing();
    await db.update(lessonRecords).set({
      recordedByUserId,
      completedAt: new Date(scheduledEnd),
      nextContent: lessonsWithoutNextContent.has(title) ? null : nextContent,
      updatedAt: new Date(),
    }).where(eq(lessonRecords.lessonId, lesson.id));
  }
}

const lessonsByTitle = new Map(
  (await db.select({ id: lessons.id, title: lessons.title }).from(lessons)).map((lesson) => [lesson.title, lesson.id]),
);
const LESSONS_PER_PAYMENT = 5;
const seedPayments = [
  ["mina.lin@example.test", "2026-08-20T00:00:00+08:00", "2026-09-03", "マンツーマン会話 60分", ["みんなの日本語 初級I"], "paid", "初級会話：自己紹介と日常表現"],
  ["yuki.mori@example.test", "2026-09-20T00:00:00+08:00", "2026-10-05", "マンツーマン会話 90分", ["中級から学ぶ日本語"], "paid", "中級会話：旅行の計画"],
  ["jun.huang@example.test", "2026-10-20T00:00:00+08:00", "2026-11-07", "ビジネス日本語", ["ニュースで学ぶ日本語"], "paid", "上級会話：ニュースディスカッション"],
  ["emma.wang@example.test", "2026-11-20T00:00:00+08:00", "2026-12-15", "発音・会話集中", ["ビジネス日本語ワークブック", "日本語発音トレーニング"], "unpaid", "初級文法：過去形の復習"],
  ["leo.nakamura@example.test", "2026-12-20T00:00:00+08:00", "2027-01-11", "試験対策レッスン", ["日本語発音トレーニング"], "paid", "中級読解：短編記事の要約"],
] as const;

for (const [studentEmail, purchasedAt, dueDate, lessonTypeName, textbookTitles, paymentStatus, lessonTitle] of seedPayments) {
  const studentId = studentsByEmail.get(studentEmail);
  const lessonType = lessonTypesByName.get(lessonTypeName);
  const lessonId = lessonsByTitle.get(lessonTitle);
  const selectedTextbooks = textbookTitles
    .map((title) => textbooksByTitle.get(title))
    .filter((textbook): textbook is typeof seededTextbooks[number] => Boolean(textbook));
  if (!studentId || !lessonType || !lessonId || selectedTextbooks.length !== textbookTitles.length) continue;

  const textbookAmountMinor = selectedTextbooks.reduce((total, textbook) => total + textbook.priceMinor, 0);
  const lessonAmountMinor = lessonType.priceMinor * LESSONS_PER_PAYMENT;
  const [insertedPayment] = await db.insert(paymentRecords).values({
    studentId,
    classId: lessonType.id,
    purchasedAt: new Date(purchasedAt),
    lessonAmountMinor,
    textbookAmountMinor,
    totalAmountMinor: lessonAmountMinor + textbookAmountMinor,
    currency: "JPY",
    status: "active",
    paymentStatus,
    dueDate: new Date(`${dueDate}T00:00:00`),
  }).onConflictDoNothing({ target: [paymentRecords.studentId, paymentRecords.purchasedAt] }).returning();
  const payment = insertedPayment ?? (await db.select().from(paymentRecords).where(and(
    eq(paymentRecords.studentId, studentId),
    eq(paymentRecords.purchasedAt, new Date(purchasedAt)),
  )).limit(1))[0];
  if (!payment) continue;

  await db.update(paymentRecords).set({ dueDate: new Date(`${dueDate}T00:00:00`), paymentStatus })
    .where(eq(paymentRecords.id, payment.id));

  for (const textbook of selectedTextbooks) {
    await db.insert(paymentRecordTextbooks).values({
      paymentRecordId: payment.id,
      textbookId: textbook.id,
      priceMinorSnapshot: textbook.priceMinor,
    }).onConflictDoNothing();
  }
  await db.insert(paymentRecordLessons).values({ paymentRecordId: payment.id, lessonId }).onConflictDoNothing();
}

console.log("Seeded users, teachers, students, assignments, lessons, records, and payment records");
