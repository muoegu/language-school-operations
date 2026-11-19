import { and, asc, count, eq, ilike } from "drizzle-orm";
import type { z } from "@hono/zod-openapi";

import type { Database } from "../../db/client.js";
import { paymentRecordTextbooks, textbooks, type Textbook } from "../../db/schema.js";
import { throwApiError } from "../../shared/errors.js";
import { assertResourceIsNotInUse } from "../../shared/resource-dependencies.js";
import type { CreateTextbookSchema, TextbookListQuerySchema, UpdateTextbookSchema } from "./schema.js";

type ListInput = z.infer<typeof TextbookListQuerySchema>;
type CreateInput = z.infer<typeof CreateTextbookSchema>;
type UpdateInput = z.infer<typeof UpdateTextbookSchema>;

const toResponse = (textbook: Textbook) => ({
  id: textbook.id,
  title: textbook.title,
  publisher: textbook.publisher,
  priceMinor: textbook.priceMinor,
  currency: textbook.currency,
  status: textbook.status,
  createdAt: textbook.createdAt.toISOString(),
  updatedAt: textbook.updatedAt.toISOString(),
});

export async function listTextbooks(db: Database, input: ListInput) {
  const conditions = [input.status ? eq(textbooks.status, input.status) : undefined].filter(Boolean);
  if (input.q) conditions.push(ilike(textbooks.title, `%${input.q}%`));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (input.page - 1) * input.pageSize;
  const [data, totalResult] = await Promise.all([
    db.select().from(textbooks).where(where).orderBy(asc(textbooks.title), asc(textbooks.id)).limit(input.pageSize).offset(offset),
    db.select({ total: count() }).from(textbooks).where(where),
  ]);
  const total = Number(totalResult[0]?.total ?? 0);
  return { data: data.map(toResponse), meta: { page: input.page, pageSize: input.pageSize, total, totalPages: total === 0 ? 0 : Math.ceil(total / input.pageSize) } };
}

export async function getTextbook(db: Database, textbookId: string) {
  const [textbook] = await db.select().from(textbooks).where(eq(textbooks.id, textbookId)).limit(1);
  if (!textbook) throwApiError(404, "RESOURCE_NOT_FOUND", "Textbook not found");
  return { data: toResponse(textbook) };
}

export async function createTextbook(db: Database, input: CreateInput) {
  const [textbook] = await db.insert(textbooks).values(input).returning();
  return { data: toResponse(textbook) };
}

export async function updateTextbook(db: Database, textbookId: string, input: UpdateInput) {
  const [textbook] = await db.update(textbooks).set({ ...input, updatedAt: new Date() }).where(eq(textbooks.id, textbookId)).returning();
  if (!textbook) throwApiError(404, "RESOURCE_NOT_FOUND", "Textbook not found");
  return { data: toResponse(textbook) };
}

export async function discontinueTextbook(db: Database, textbookId: string) {
  const [paymentRows] = await db.select({ count: count() }).from(paymentRecordTextbooks).where(eq(paymentRecordTextbooks.textbookId, textbookId));
  assertResourceIsNotInUse("textbook", textbookId, [
    { type: "paymentRecordTextbooks", count: Number(paymentRows?.count ?? 0) },
  ]);
  const [textbook] = await db.update(textbooks).set({ status: "discontinued", updatedAt: new Date() }).where(eq(textbooks.id, textbookId)).returning({ id: textbooks.id });
  if (!textbook) throwApiError(404, "RESOURCE_NOT_FOUND", "Textbook not found");
}
