import { z } from "@hono/zod-openapi";

export const paymentRecordStatuses = ["active", "used_up", "expired", "cancelled"] as const;
export const paymentStatuses = ["unpaid", "paid", "refunded"] as const;

const PaymentRecordTextbookSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  priceMinor: z.number().int(),
  priceMinorSnapshot: z.number().int(),
}).openapi("PaymentRecordTextbook");

export const PaymentRecordSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  studentName: z.string(),
  classId: z.string().uuid().nullable(),
  className: z.string().nullable(),
  purchasedAt: z.iso.datetime(),
  dueDate: z.iso.date().nullable(),
  lessonCount: z.literal(5),
  usedLessonCount: z.number().int().min(0).max(5),
  remainingLessons: z.number().int().min(0).max(5),
  lessonAmountMinor: z.number().int().min(0),
  textbookAmountMinor: z.number().int().min(0),
  totalAmountMinor: z.number().int().min(0),
  currency: z.string(),
  status: z.enum(paymentRecordStatuses),
  paymentStatus: z.enum(paymentStatuses),
  textbooks: z.array(PaymentRecordTextbookSchema),
  lessonIds: z.array(z.string().uuid()),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).openapi("PaymentRecord");

export const PaymentRecordListSchema = z.object({
  data: z.array(PaymentRecordSchema),
  meta: z.object({ page: z.number().int(), pageSize: z.number().int(), total: z.number().int(), totalPages: z.number().int() }),
}).openapi("PaymentRecordListResponse");

export const PaymentRecordParamsSchema = z.object({ paymentRecordId: z.string().uuid() }).openapi("PaymentRecordParams");

export const PaymentRecordListQuerySchema = z.object({
  studentId: z.string().uuid().optional(),
  status: z.enum(paymentRecordStatuses).optional(),
  paymentStatus: z.enum(paymentStatuses).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
}).openapi("PaymentRecordListQuery");

const PaymentRecordCreateFields = {
  studentId: z.string().uuid(),
  classId: z.string().uuid(),
  purchasedAt: z.iso.datetime(),
  dueDate: z.iso.date().nullable().optional(),
  textbookIds: z.array(z.string().uuid()).max(20).default([]),
  lessonIds: z.array(z.string().uuid()).max(5).default([]),
  paymentStatus: z.enum(paymentStatuses).default("paid"),
};

export const CreatePaymentRecordSchema = z.object(PaymentRecordCreateFields).openapi("CreatePaymentRecordRequest");

export const UpdatePaymentRecordSchema = z.object({
  purchasedAt: z.iso.datetime().optional(),
  dueDate: z.iso.date().nullable().optional(),
  classId: z.string().uuid().optional(),
  textbookIds: z.array(z.string().uuid()).max(20).optional(),
  lessonIds: z.array(z.string().uuid()).max(5).optional(),
  status: z.enum(paymentRecordStatuses).optional(),
  paymentStatus: z.enum(paymentStatuses).optional(),
}).refine((input) => Object.keys(input).length > 0, { message: "At least one field is required" })
  .openapi("UpdatePaymentRecordRequest");

export const PaymentRecordResponseSchema = z.object({ data: PaymentRecordSchema }).openapi("PaymentRecordResponse");
