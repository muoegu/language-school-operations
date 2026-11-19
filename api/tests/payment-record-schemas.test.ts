import { describe, expect, it } from "vitest";

import { CreatePaymentRecordSchema, UpdatePaymentRecordSchema } from "../src/features/payment-records/schema.js";

const ids = {
  studentId: "00000000-0000-4000-8000-000000000001",
  classId: "00000000-0000-4000-8000-000000000002",
  textbookId: "00000000-0000-4000-8000-000000000003",
  lessonId: "00000000-0000-4000-8000-000000000004",
};

describe("payment record request schemas", () => {
  it("accepts a five-lesson payment record", () => {
    expect(CreatePaymentRecordSchema.parse({
      studentId: ids.studentId,
      classId: ids.classId,
      purchasedAt: "2026-11-18T00:00:00.000Z",
      textbookIds: [ids.textbookId],
      lessonIds: [ids.lessonId],
    })).toMatchObject({ paymentStatus: "paid", textbookIds: [ids.textbookId] });
  });

  it("rejects more than five used lessons", () => {
    expect(() => CreatePaymentRecordSchema.parse({
      studentId: ids.studentId,
      classId: ids.classId,
      purchasedAt: "2026-11-18T00:00:00.000Z",
      lessonIds: Array.from({ length: 6 }, (_, index) => `00000000-0000-4000-8000-00000000000${index + 1}`),
    })).toThrow();
  });

  it("accepts payment status updates", () => {
    expect(UpdatePaymentRecordSchema.parse({ paymentStatus: "refunded" })).toEqual({ paymentStatus: "refunded" });
  });

  it("requires at least one update field", () => {
    expect(() => UpdatePaymentRecordSchema.parse({})).toThrow();
  });
});
