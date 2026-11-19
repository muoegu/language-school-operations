import { and, asc, count, eq, gte, lt } from "drizzle-orm";
import type { z } from "@hono/zod-openapi";

import type { Database } from "../../db/client.js";
import { paymentRecords } from "../../db/schema.js";
import { getRows } from "../payment-records/service.js";
import type { PaymentReportQuerySchema } from "./schema.js";

type QueryInput = z.infer<typeof PaymentReportQuerySchema>;

function startOfDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function endOfDate(value: string) {
  const date = startOfDate(value);
  date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

export async function getPaymentReport(db: Database, input: QueryInput) {
  const conditions = [
    input.from ? gte(paymentRecords.purchasedAt, startOfDate(input.from)) : undefined,
    input.to ? lt(paymentRecords.purchasedAt, endOfDate(input.to)) : undefined,
  ].filter((condition): condition is NonNullable<typeof condition> => Boolean(condition));
  const where = conditions.length ? and(...conditions) : undefined;

  const [allIdRows, totalResult] = await Promise.all([
    db.select({ id: paymentRecords.id }).from(paymentRecords).where(where).orderBy(asc(paymentRecords.purchasedAt), asc(paymentRecords.id)),
    db.select({ total: count() }).from(paymentRecords).where(where),
  ]);
  const allRecords = await getRows(db, allIdRows.map((row) => row.id));
  const offset = (input.page - 1) * input.pageSize;
  const records = allRecords.slice(offset, offset + input.pageSize);

  const monthly = new Map<string, { recordCount: number; totalAmountMinor: number }>();
  const byPaymentStatus = new Map<string, { recordCount: number; totalAmountMinor: number }>();
  const byClass = new Map<string, { classId: string | null; className: string; recordCount: number; totalAmountMinor: number }>();
  let lessonAmountMinor = 0;
  let textbookAmountMinor = 0;
  let totalAmountMinor = 0;

  for (const record of allRecords) {
    lessonAmountMinor += record.lessonAmountMinor;
    textbookAmountMinor += record.textbookAmountMinor;
    totalAmountMinor += record.totalAmountMinor;

    const month = record.purchasedAt.slice(0, 7);
    const monthlyValue = monthly.get(month) ?? { recordCount: 0, totalAmountMinor: 0 };
    monthlyValue.recordCount += 1;
    monthlyValue.totalAmountMinor += record.totalAmountMinor;
    monthly.set(month, monthlyValue);

    const statusValue = byPaymentStatus.get(record.paymentStatus) ?? { recordCount: 0, totalAmountMinor: 0 };
    statusValue.recordCount += 1;
    statusValue.totalAmountMinor += record.totalAmountMinor;
    byPaymentStatus.set(record.paymentStatus, statusValue);

    const classKey = record.classId ?? "unknown";
    const classValue = byClass.get(classKey) ?? { classId: record.classId, className: record.className ?? "クラス未設定", recordCount: 0, totalAmountMinor: 0 };
    classValue.recordCount += 1;
    classValue.totalAmountMinor += record.totalAmountMinor;
    byClass.set(classKey, classValue);
  }

  const total = Number(totalResult[0]?.total ?? 0);
  return {
    data: {
      records,
      summary: {
        recordCount: total,
        totalAmountMinor,
        lessonAmountMinor,
        textbookAmountMinor,
        paidCount: allRecords.filter((record) => record.paymentStatus === "paid").length,
        unpaidCount: allRecords.filter((record) => record.paymentStatus === "unpaid").length,
        refundedCount: allRecords.filter((record) => record.paymentStatus === "refunded").length,
      },
      monthly: [...monthly.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, value]) => ({ month, ...value })),
      byPaymentStatus: [...byPaymentStatus.entries()].map(([status, value]) => ({ status, ...value })) as Array<{ status: "unpaid" | "paid" | "refunded"; recordCount: number; totalAmountMinor: number }>,
      byClass: [...byClass.values()].sort((a, b) => b.totalAmountMinor - a.totalAmountMinor),
      meta: { page: input.page, pageSize: input.pageSize, total, totalPages: total === 0 ? 0 : Math.ceil(total / input.pageSize) },
    },
  };
}
