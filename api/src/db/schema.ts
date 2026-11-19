import {
  boolean,
  check,
  date,
  integer,
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const lessonStatus = pgEnum("lesson_status", [
  "scheduled",
  "completed",
  "absent",
  "cancelled",
]);

export const userRole = pgEnum("user_role", ["representative", "teacher", "staff"]);

export const lessonTeacherRole = pgEnum("lesson_teacher_role", [
  "primary",
  "assistant",
]);

export const lessonParticipationStatus = pgEnum("lesson_participation_status", [
  "scheduled",
  "attended",
  "absent",
  "cancelled",
  "late",
]);

export const textbookStatus = pgEnum("textbook_status", ["selling", "discontinued"]);

export const paymentRecordStatus = pgEnum("payment_record_status", [
  "active",
  "used_up",
  "expired",
  "cancelled",
]);

export const paymentStatus = pgEnum("payment_status", ["unpaid", "paid", "refunded"]);

export const attendanceStatus = pgEnum("attendance_status", ["present", "late", "absent"]);

const auditColumns = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    externalUserId: varchar("external_user_id", { length: 255 }),
    email: varchar("email", { length: 255 }),
    displayName: varchar("display_name", { length: 100 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("users_external_user_id_unique").on(table.externalUserId),
    uniqueIndex("users_email_unique").on(table.email),
    index("users_active_idx").on(table.isActive),
    index("users_active_name_idx").on(table.isActive, table.displayName),
    check("users_display_name_not_blank", sql`length(trim(${table.displayName})) > 0`),
    check("users_email_format", sql`${table.email} is null or ${table.email} ~ '^[^[:space:]@]+@[^[:space:]@]+$'`),
  ],
);

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: userRole("role").notNull(),
    ...auditColumns,
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.role] }),
    uniqueIndex("user_roles_user_id_unique").on(table.userId),
  ],
);

export const teachers = pgTable(
  "teachers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    displayName: varchar("display_name", { length: 100 }).notNull(),
    email: varchar("email", { length: 255 }),
    employmentStartDate: date("employment_start_date", { mode: "string" }).notNull().defaultNow(),
    employmentEndDate: date("employment_end_date", { mode: "string" }),
    isActive: boolean("is_active").notNull().default(true),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("teachers_user_id_unique")
      .on(table.userId)
      .where(sql`${table.userId} is not null`),
    uniqueIndex("teachers_email_unique").on(table.email),
    index("teachers_active_idx").on(table.isActive),
    index("teachers_active_name_idx").on(table.isActive, table.displayName),
    check("teachers_display_name_not_blank", sql`length(trim(${table.displayName})) > 0`),
    check("teachers_email_format", sql`${table.email} is null or ${table.email} ~ '^[^[:space:]@]+@[^[:space:]@]+$'`),
    check("teachers_employment_dates_valid", sql`${table.employmentEndDate} is null or ${table.employmentEndDate} >= ${table.employmentStartDate}`),
  ],
);

export const staffMembers = pgTable(
  "staff_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    displayName: varchar("display_name", { length: 100 }).notNull(),
    department: varchar("department", { length: 100 }),
    isActive: boolean("is_active").notNull().default(true),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("staff_members_user_id_unique").on(table.userId),
    index("staff_members_active_idx").on(table.isActive),
    index("staff_members_active_name_idx").on(table.isActive, table.displayName),
    check("staff_members_display_name_not_blank", sql`length(trim(${table.displayName})) > 0`),
  ],
);

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    attendanceDate: timestamp("attendance_date", { withTimezone: false }).notNull(),
    clockInAt: timestamp("clock_in_at", { withTimezone: true }),
    clockOutAt: timestamp("clock_out_at", { withTimezone: true }),
    status: attendanceStatus("status").notNull().default("present"),
    note: varchar("note", { length: 500 }),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("attendance_records_user_date_unique").on(table.userId, table.attendanceDate),
    index("attendance_records_user_date_idx").on(table.userId, table.attendanceDate),
    index("attendance_records_date_status_idx").on(table.attendanceDate, table.status),
    check("attendance_records_clock_out_after_clock_in", sql`${table.clockOutAt} is null or ${table.clockInAt} is null or ${table.clockOutAt} >= ${table.clockInAt}`),
    check("attendance_records_note_not_blank", sql`${table.note} is null or length(trim(${table.note})) > 0`),
  ],
);

export const students = pgTable(
  "students",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    displayName: varchar("display_name", { length: 100 }).notNull(),
    email: varchar("email", { length: 255 }),
    birthDate: timestamp("birth_date", { withTimezone: false }),
    level: varchar("level", { length: 30 }),
    classId: uuid("class_id").references(() => classes.id, { onDelete: "set null" }),
    isActive: boolean("is_active").notNull().default(true),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("students_email_unique").on(table.email),
    index("students_active_idx").on(table.isActive),
    index("students_active_name_idx").on(table.isActive, table.displayName),
    check("students_display_name_not_blank", sql`length(trim(${table.displayName})) > 0`),
    check("students_level_not_blank", sql`${table.level} is null or length(trim(${table.level})) > 0`),
    check("students_email_format", sql`${table.email} is null or ${table.email} ~ '^[^[:space:]@]+@[^[:space:]@]+$'`),
  ],
);

export const classes = pgTable(
  "classes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 150 }).notNull(),
    level: varchar("level", { length: 30 }).notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    priceMinor: integer("price_minor").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("JPY"),
    isActive: boolean("is_active").notNull().default(true),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("classes_name_unique").on(table.name),
    index("classes_active_idx").on(table.isActive),
    index("classes_active_name_idx").on(table.isActive, table.name),
    check("classes_name_not_blank", sql`length(trim(${table.name})) > 0`),
    check("classes_level_not_blank", sql`length(trim(${table.level})) > 0`),
    check("classes_duration_positive", sql`${table.durationMinutes} > 0`),
    check("classes_price_nonnegative", sql`${table.priceMinor} >= 0`),
    check("classes_currency_iso_code", sql`${table.currency} ~ '^[A-Z]{3}$'`),
  ],
);

export const textbooks = pgTable(
  "textbooks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 200 }).notNull(),
    publisher: varchar("publisher", { length: 150 }).notNull(),
    priceMinor: integer("price_minor").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("JPY"),
    status: textbookStatus("status").notNull().default("selling"),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("textbooks_title_unique").on(table.title),
    index("textbooks_status_idx").on(table.status),
    index("textbooks_status_title_idx").on(table.status, table.title),
    check("textbooks_title_not_blank", sql`length(trim(${table.title})) > 0`),
    check("textbooks_publisher_not_blank", sql`length(trim(${table.publisher})) > 0`),
    check("textbooks_price_nonnegative", sql`${table.priceMinor} >= 0`),
    check("textbooks_currency_iso_code", sql`${table.currency} ~ '^[A-Z]{3}$'`),
  ],
);

export const paymentRecords = pgTable(
  "payment_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "restrict" }),
    classId: uuid("class_id").references(() => classes.id, { onDelete: "set null" }),
    purchasedAt: timestamp("purchased_at", { withTimezone: true }).notNull(),
    dueDate: timestamp("due_date", { withTimezone: false }),
    lessonAmountMinor: integer("lesson_amount_minor").notNull(),
    textbookAmountMinor: integer("textbook_amount_minor").notNull().default(0),
    totalAmountMinor: integer("total_amount_minor").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("JPY"),
    status: paymentRecordStatus("status").notNull().default("active"),
    paymentStatus: paymentStatus("payment_status").notNull().default("paid"),
    ...auditColumns,
  },
  (table) => [
    index("payment_records_class_idx").on(table.classId),
    uniqueIndex("payment_records_student_purchased_at_unique").on(table.studentId, table.purchasedAt),
    index("payment_records_student_idx").on(table.studentId, table.purchasedAt),
    index("payment_records_status_idx").on(table.status, table.paymentStatus),
    check("payment_records_lesson_amount_nonnegative", sql`${table.lessonAmountMinor} >= 0`),
    check("payment_records_textbook_amount_nonnegative", sql`${table.textbookAmountMinor} >= 0`),
    check("payment_records_total_amount_nonnegative", sql`${table.totalAmountMinor} >= 0`),
    check("payment_records_total_amount_matches_parts", sql`${table.totalAmountMinor} = ${table.lessonAmountMinor} + ${table.textbookAmountMinor}`),
    check("payment_records_due_date_not_before_purchase", sql`${table.dueDate} is null or ${table.dueDate} >= (${table.purchasedAt})::date`),
    check("payment_records_currency_iso_code", sql`${table.currency} ~ '^[A-Z]{3}$'`),
    check("payment_records_updated_after_created", sql`${table.updatedAt} >= ${table.createdAt}`),
  ],
);

export const paymentRecordTextbooks = pgTable(
  "payment_record_textbooks",
  {
    paymentRecordId: uuid("payment_record_id")
      .notNull()
      .references(() => paymentRecords.id, { onDelete: "cascade" }),
    textbookId: uuid("textbook_id")
      .notNull()
      .references(() => textbooks.id, { onDelete: "restrict" }),
    priceMinorSnapshot: integer("price_minor_snapshot").notNull(),
    ...auditColumns,
  },
  (table) => [
    primaryKey({ columns: [table.paymentRecordId, table.textbookId] }),
    index("payment_record_textbooks_textbook_idx").on(table.textbookId),
    check("payment_record_textbooks_price_nonnegative", sql`${table.priceMinorSnapshot} >= 0`),
  ],
);

export const paymentRecordLessons = pgTable(
  "payment_record_lessons",
  {
    paymentRecordId: uuid("payment_record_id")
      .notNull()
      .references(() => paymentRecords.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "restrict" }),
    usedAt: timestamp("used_at", { withTimezone: true }).notNull().defaultNow(),
    ...auditColumns,
  },
  (table) => [
    primaryKey({ columns: [table.paymentRecordId, table.lessonId] }),
    index("payment_record_lessons_lesson_idx").on(table.lessonId),
    index("payment_record_lessons_used_at_idx").on(table.usedAt),
  ],
);

export const teacherStudentAssignments = pgTable(
  "teacher_student_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => teachers.id, { onDelete: "restrict" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "restrict" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("teacher_student_assignments_active_unique")
      .on(table.teacherId, table.studentId)
      .where(sql`${table.isActive} = true`),
    index("teacher_student_assignments_teacher_idx").on(table.teacherId, table.isActive),
    index("teacher_student_assignments_student_idx").on(table.studentId, table.isActive),
    check("teacher_student_assignments_end_after_start", sql`${table.endedAt} is null or ${table.endedAt} >= ${table.assignedAt}`),
    check("teacher_student_assignments_inactive_has_end", sql`${table.isActive} = true or ${table.endedAt} is not null`),
  ],
);

export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    classId: uuid("class_id").references(() => classes.id, { onDelete: "set null" }),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => teachers.id, { onDelete: "restrict" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "restrict" }),
    title: varchar("title", { length: 150 }).notNull(),
    level: varchar("level", { length: 30 }),
    scheduledStartAt: timestamp("scheduled_start_at", { withTimezone: true }).notNull(),
    scheduledEndAt: timestamp("scheduled_end_at", { withTimezone: true }).notNull(),
    status: lessonStatus("status").notNull().default("scheduled"),
    statusReason: text("status_reason"),
    ...auditColumns,
  },
  (table) => [
    index("lessons_class_idx").on(table.classId),
    index("lessons_scheduled_start_at_idx").on(table.scheduledStartAt),
    index("lessons_teacher_start_at_idx").on(table.teacherId, table.scheduledStartAt),
    index("lessons_status_start_at_idx").on(table.status, table.scheduledStartAt),
    index("lessons_student_start_at_idx").on(table.studentId, table.scheduledStartAt),
    check("lessons_title_not_blank", sql`length(trim(${table.title})) > 0`),
    check("lessons_status_reason_not_blank", sql`${table.statusReason} is null or length(trim(${table.statusReason})) > 0`),
    check("lessons_scheduled_time_order", sql`${table.scheduledEndAt} > ${table.scheduledStartAt}`),
  ],
);

export const lessonTeachers = pgTable(
  "lesson_teachers",
  {
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => teachers.id, { onDelete: "restrict" }),
    role: lessonTeacherRole("role").notNull().default("primary"),
    ...auditColumns,
  },
  (table) => [
    primaryKey({ columns: [table.lessonId, table.teacherId] }),
    uniqueIndex("lesson_teachers_primary_unique")
      .on(table.lessonId)
      .where(sql`${table.role} = 'primary'`),
    index("lesson_teachers_teacher_idx").on(table.teacherId),
    index("lesson_teachers_teacher_role_idx").on(table.teacherId, table.role),
  ],
);

export const lessonStudents = pgTable(
  "lesson_students",
  {
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "restrict" }),
    participationStatus: lessonParticipationStatus("participation_status")
      .notNull()
      .default("scheduled"),
    ...auditColumns,
  },
  (table) => [
    primaryKey({ columns: [table.lessonId, table.studentId] }),
    index("lesson_students_student_idx").on(table.studentId),
    index("lesson_students_student_status_idx").on(table.studentId, table.participationStatus),
  ],
);

export const lessonRecords = pgTable(
  "lesson_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    recordedByUserId: uuid("recorded_by_user_id").references(() => users.id, { onDelete: "set null" }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    actualStartAt: timestamp("actual_start_at", { withTimezone: true }),
    actualEndAt: timestamp("actual_end_at", { withTimezone: true }),
    note: text("note"),
    nextContent: text("next_content"),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("lesson_records_lesson_id_unique").on(table.lessonId),
    index("lesson_records_recorded_by_user_idx").on(table.recordedByUserId),
    index("lesson_records_actual_start_at_idx").on(table.actualStartAt),
    check("lesson_records_actual_time_order", sql`${table.actualEndAt} > ${table.actualStartAt}`),
    check("lesson_records_actual_time_pair", sql`(${table.actualStartAt} is null and ${table.actualEndAt} is null) or (${table.actualStartAt} is not null and ${table.actualEndAt} is not null)`),
    check("lesson_records_note_not_blank", sql`${table.note} is null or length(trim(${table.note})) > 0`),
    check("lesson_records_next_content_not_blank", sql`${table.nextContent} is null or length(trim(${table.nextContent})) > 0`),
  ],
);

export type Teacher = typeof teachers.$inferSelect;
export type User = typeof users.$inferSelect;
export type UserRole = typeof userRoles.$inferSelect;
export type StaffMember = typeof staffMembers.$inferSelect;
export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type Student = typeof students.$inferSelect;
export type Class = typeof classes.$inferSelect;
/** @deprecated Use classes. Kept while application code migrates to class terminology. */
export const lessonTypes = classes;
/** @deprecated Use Class. */
export type LessonType = Class;
export type Textbook = typeof textbooks.$inferSelect;
export type PaymentRecord = typeof paymentRecords.$inferSelect;
export type PaymentRecordTextbook = typeof paymentRecordTextbooks.$inferSelect;
export type PaymentRecordLesson = typeof paymentRecordLessons.$inferSelect;
export type TeacherStudentAssignment = typeof teacherStudentAssignments.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;
export type LessonTeacher = typeof lessonTeachers.$inferSelect;
export type LessonStudent = typeof lessonStudents.$inferSelect;
export type LessonRecord = typeof lessonRecords.$inferSelect;
