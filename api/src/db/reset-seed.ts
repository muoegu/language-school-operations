import "../config/load-env.js";

import { sql } from "drizzle-orm";

import { getDb } from "./client.js";

const databaseUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL or DATABASE_URL_UNPOOLED is required to reset the database");
}

const db = getDb({ DATABASE_URL: databaseUrl });

await db.execute(sql`
  TRUNCATE TABLE
    payment_record_lessons,
    payment_record_textbooks,
    payment_records,
    lesson_records,
    lesson_students,
    lesson_teachers,
    lessons,
    teacher_student_assignments,
    attendance_records,
    staff_members,
    user_roles,
    teachers,
    students,
    users,
    textbooks,
    classes
  RESTART IDENTITY CASCADE
`);

console.log("Cleared application data");
