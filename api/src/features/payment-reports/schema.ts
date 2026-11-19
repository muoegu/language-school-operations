import { z } from "@hono/zod-openapi";
import { PaymentRecordSchema } from "../payment-records/schema.js";

export const PaymentReportQuerySchema = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(100),
}).refine((input) => !input.from || !input.to || input.from <= input.to, {
  message: "from must be before or equal to to",
  path: ["to"],
}).openapi("PaymentReportQuery");

const PaymentReportSummarySchema = z.object({
  recordCount: z.number().int().nonnegative(),
  totalAmountMinor: z.number().int().nonnegative(),
  lessonAmountMinor: z.number().int().nonnegative(),
  textbookAmountMinor: z.number().int().nonnegative(),
  paidCount: z.number().int().nonnegative(),
  unpaidCount: z.number().int().nonnegative(),
  refundedCount: z.number().int().nonnegative(),
}).openapi("PaymentReportSummary");

const PaymentReportMonthlySchema = z.object({
  month: z.string(),
  recordCount: z.number().int().nonnegative(),
  totalAmountMinor: z.number().int().nonnegative(),
}).openapi("PaymentReportMonthly");

const PaymentReportStatusSchema = z.object({
  status: z.enum(["unpaid", "paid", "refunded"]),
  recordCount: z.number().int().nonnegative(),
  totalAmountMinor: z.number().int().nonnegative(),
}).openapi("PaymentReportStatus");

const PaymentReportClassSchema = z.object({
  classId: z.string().uuid().nullable(),
  className: z.string(),
  recordCount: z.number().int().nonnegative(),
  totalAmountMinor: z.number().int().nonnegative(),
}).openapi("PaymentReportClass");

export const PaymentReportResponseSchema = z.object({
  data: z.object({
    records: z.array(PaymentRecordSchema),
    summary: PaymentReportSummarySchema,
    monthly: z.array(PaymentReportMonthlySchema),
    byPaymentStatus: z.array(PaymentReportStatusSchema),
    byClass: z.array(PaymentReportClassSchema),
    meta: z.object({ page: z.number().int(), pageSize: z.number().int(), total: z.number().int(), totalPages: z.number().int() }),
  }).openapi("PaymentReport"),
}).openapi("PaymentReportResponse");
