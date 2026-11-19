import { describe, expect, it } from "vitest";

import { CreateLessonSchema, UpdateLessonSchema } from "../src/features/lessons/schema.js";
import { CreateLessonRecordSchema } from "../src/features/lesson-records/schema.js";
import { normalizeParticipants } from "../src/features/lessons/service.js";
import { resolveTimes } from "../src/features/lesson-records/service.js";

const teacherId = "00000000-0000-4000-8000-000000000002";
const studentId = "00000000-0000-4000-8000-000000000003";
const classId = "00000000-0000-4000-8000-000000000010";

describe("lesson request schemas", () => {
  it("accepts multiple participants", () => {
    const result = CreateLessonSchema.safeParse({
      classId,
      teacherIds: [teacherId],
      studentIds: [studentId],
      title: "Business Japanese",
      scheduledStart: "2026-11-20T01:00:00.000Z",
      scheduledEnd: "2026-11-20T02:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("keeps accepting legacy singular participant fields during migration", () => {
    const result = CreateLessonSchema.safeParse({
      classId,
      teacherId,
      studentId,
      title: "Business Japanese",
      scheduledStart: "2026-11-20T01:00:00.000Z",
      scheduledEnd: "2026-11-20T02:00:00.000Z",
    });

    expect(result.success).toBe(true);
  });

  it("requires at least one teacher and student", () => {
    const result = CreateLessonSchema.safeParse({
      classId,
      teacherIds: [],
      studentIds: [],
      title: "Business Japanese",
      scheduledStart: "2026-11-20T01:00:00.000Z",
      scheduledEnd: "2026-11-20T02:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a reversed schedule", () => {
    const result = CreateLessonSchema.safeParse({
      classId,
      teacherIds: [teacherId],
      studentIds: [studentId],
      title: "Business Japanese",
      scheduledStart: "2026-11-20T02:00:00.000Z",
      scheduledEnd: "2026-11-20T01:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });

  it("rejects an empty lesson update", () => {
    expect(UpdateLessonSchema.safeParse({}).success).toBe(false);
  });
});

describe("lesson record schema", () => {
  it("accepts absence without actual times", () => {
    const result = CreateLessonRecordSchema.safeParse({
      outcome: "absent",
      note: "Student was absent",
      nextContent: "Review chapter 3",
    });

    expect(result.success).toBe(true);
  });

  it("requires actual times for completed records", () => {
    expect(CreateLessonRecordSchema.safeParse({ outcome: "completed" }).success).toBe(true);
    expect(() => resolveTimes({ outcome: "completed" })).toThrow();
  });

  it("rejects reversed actual times", () => {
    expect(() => resolveTimes({
      outcome: "completed",
      actualStart: "2026-11-20T02:00:00.000Z",
      actualEnd: "2026-11-20T01:00:00.000Z",
    })).toThrow();
  });

  it("rejects invalid actual datetimes", () => {
    expect(() => resolveTimes({
      outcome: "completed",
      actualStart: "not-a-datetime",
      actualEnd: "2026-11-20T01:00:00.000Z",
    })).toThrow();
  });

  it("clears actual times for absence and cancellation", () => {
    expect(resolveTimes({ outcome: "absent", actualStart: "2026-11-20T01:00:00.000Z" })).toEqual({
      actualStartAt: null,
      actualEndAt: null,
    });
    expect(resolveTimes({ outcome: "cancelled" })).toEqual({
      actualStartAt: null,
      actualEndAt: null,
    });
  });

  it("deduplicates participant IDs and supports legacy fields", () => {
    expect(normalizeParticipants({
      teacherIds: [teacherId, teacherId],
      studentId,
    })).toEqual({ teacherIds: [teacherId], studentIds: [studentId] });
  });
});
