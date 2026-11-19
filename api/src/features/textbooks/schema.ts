import { z } from "@hono/zod-openapi";

const TextbookFields = {
  title: z.string().trim().min(1).max(200).openapi({ example: "みんなの日本語 初級I" }),
  publisher: z.string().trim().min(1).max(150).openapi({ example: "スリーエーネットワーク" }),
  priceMinor: z.number().int().min(0).openapi({ example: 2750 }),
  currency: z.string().trim().length(3).default("JPY").openapi({ example: "JPY" }),
};

export const TextbookSchema = z.object({
  id: z.string().uuid(),
  ...TextbookFields,
  status: z.enum(["selling", "discontinued"]),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).openapi("Textbook");

export const TextbookListSchema = z.object({
  data: z.array(TextbookSchema),
  meta: z.object({ page: z.number().int(), pageSize: z.number().int(), total: z.number().int(), totalPages: z.number().int() }),
}).openapi("TextbookListResponse");

export const TextbookParamsSchema = z.object({ textbookId: z.string().uuid() }).openapi("TextbookParams");

export const TextbookListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(["selling", "discontinued"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
}).openapi("TextbookListQuery");

export const CreateTextbookSchema = z.object({
  ...TextbookFields,
  status: z.enum(["selling", "discontinued"]).default("selling"),
}).openapi("CreateTextbookRequest");

export const UpdateTextbookSchema = z.object({
  title: TextbookFields.title.optional(),
  publisher: TextbookFields.publisher.optional(),
  priceMinor: TextbookFields.priceMinor.optional(),
  currency: z.string().trim().length(3).optional().openapi({ example: "JPY" }),
  status: z.enum(["selling", "discontinued"]).optional(),
}).refine((input) => Object.keys(input).length > 0, { message: "At least one field is required" })
  .openapi("UpdateTextbookRequest");

export const TextbookResponseSchema = z.object({ data: TextbookSchema }).openapi("TextbookResponse");
