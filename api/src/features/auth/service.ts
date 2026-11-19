import { and, asc, eq } from "drizzle-orm";

import type { Database } from "../../db/client.js";
import {
  staffMembers,
  classes,
  students,
  teacherStudentAssignments,
  teachers,
  userRoles,
  users,
} from "../../db/schema.js";
import { throwApiError } from "../../shared/errors.js";

const encoder = new TextEncoder();
const SESSION_TTL_SECONDS = 60 * 60 * 8;

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function fromBase64Url(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return toBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value))));
}

async function verify(value: string, signature: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return crypto.subtle.verify("HMAC", key, fromBase64Url(signature), encoder.encode(value));
}

export function getSessionSecret(env: { DEMO_SESSION_SECRET?: string; NODE_ENV?: string }) {
  if (env.DEMO_SESSION_SECRET) return env.DEMO_SESSION_SECRET;
  if (env.NODE_ENV === "production") {
    throw new Error("DEMO_SESSION_SECRET is required in production");
  }
  return "portfolio-system-local-demo-secret";
}

export async function createSessionCookie(userId: string, secret: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `${userId}.${expiresAt}`;
  const signature = await sign(payload, secret);
  return `${payload}.${signature}`;
}

export async function getSessionUserId(cookie: string | undefined, secret: string) {
  if (!cookie) return undefined;
  const [userId, expiresAtValue, signature] = cookie.split(".");
  if (!userId || !expiresAtValue || !signature) return undefined;
  const expiresAt = Number(expiresAtValue);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return undefined;
  if (!(await verify(`${userId}.${expiresAtValue}`, signature, secret))) return undefined;
  return userId;
}

export async function listDemoLoginOptions(db: Database) {
  const data = await db.select({
    userId: users.id,
    displayName: users.displayName,
    role: userRoles.role,
    teacherId: teachers.id,
  }).from(users)
    .innerJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(teachers, eq(teachers.userId, users.id))
    .where(eq(users.isActive, true)).orderBy(asc(users.displayName));
  return { data };
}

export async function loginAsDemoUser(db: Database, input: { userId?: string; teacherId?: string }) {
  if (input.userId) {
    const [user] = await db.select({ id: users.id }).from(users)
      .where(and(eq(users.id, input.userId), eq(users.isActive, true))).limit(1);
    if (!user) throwApiError(401, "UNAUTHORIZED", "This user is not available for demo login");
    return user.id;
  }
  const teacherId = input.teacherId;
  if (!teacherId) throwApiError(400, "VALIDATION_ERROR", "userId or teacherId is required");
  const [teacher] = await db.select({ userId: teachers.userId }).from(teachers)
    .where(and(eq(teachers.id, teacherId), eq(teachers.isActive, true))).limit(1);
  if (!teacher?.userId) throwApiError(401, "UNAUTHORIZED", "This teacher is not available for demo login");
  const [user] = await db.select({ id: users.id }).from(users)
    .where(and(eq(users.id, teacher.userId), eq(users.isActive, true))).limit(1);
  if (!user) throwApiError(401, "UNAUTHORIZED", "This user is not available for demo login");
  return user.id;
}

export async function getCurrentUser(db: Database, userId: string) {
  const [user] = await db.select({
    id: users.id,
    displayName: users.displayName,
    email: users.email,
    teacherId: teachers.id,
    staffMemberId: staffMembers.id,
  }).from(users)
    .leftJoin(teachers, eq(teachers.userId, users.id))
    .leftJoin(staffMembers, eq(staffMembers.userId, users.id))
    .where(and(eq(users.id, userId), eq(users.isActive, true))).limit(1);
  if (!user) throwApiError(401, "UNAUTHORIZED", "Authentication required");
  const [assignedRole] = await db.select({ role: userRoles.role }).from(userRoles)
    .where(eq(userRoles.userId, userId)).limit(1);
  if (!assignedRole) throwApiError(403, "FORBIDDEN", "User role is not assigned");
  return { ...user, role: assignedRole.role };
}

export async function listMyStudents(db: Database, userId: string) {
  const currentUser = await getCurrentUser(db, userId);
  if (!currentUser.teacherId) throwApiError(403, "FORBIDDEN", "Only teachers can access assigned students");
  const data = await db.select({
    id: students.id,
    displayName: students.displayName,
    email: students.email,
    level: students.level,
    classId: students.classId,
    className: classes.name,
    assignedAt: teacherStudentAssignments.assignedAt,
  }).from(teacherStudentAssignments)
    .innerJoin(students, eq(students.id, teacherStudentAssignments.studentId))
    .leftJoin(classes, eq(classes.id, students.classId))
    .where(and(
      eq(teacherStudentAssignments.teacherId, currentUser.teacherId),
      eq(teacherStudentAssignments.isActive, true),
      eq(students.isActive, true),
    )).orderBy(asc(students.displayName));
  return { data: data.map((student) => ({ ...student, assignedAt: student.assignedAt.toISOString() })) };
}
