import { HTTPException } from "hono/http-exception";
import { z } from "@hono/zod-openapi";

const apiErrorCodes = [
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "RESOURCE_NOT_FOUND",
  "DUPLICATE_RESOURCE",
  "RESOURCE_IN_USE",
  "INVALID_STATUS_TRANSITION",
  "SCHEDULE_CONFLICT",
  "PAYMENT_REQUIRED",
  "NOT_FOUND",
  "INTERNAL_SERVER_ERROR",
] as const;

export const ApiErrorResponseSchema = z
  .object({
    error: z.object({
      code: z.enum(apiErrorCodes),
      message: z.string(),
      requestId: z.string().uuid(),
      details: z.object({
        resourceType: z.string().optional(),
        resourceId: z.string().uuid().optional(),
        dependencies: z.array(z.object({
          type: z.string(),
          count: z.number().int().nonnegative(),
        })).optional(),
      }).optional(),
    }),
  })
  .openapi("ApiErrorResponse");

const errorResponse = (description: string) => ({
  content: { "application/json": { schema: ApiErrorResponseSchema } },
  description,
});

export const apiErrorResponses = {
  400: errorResponse("Invalid request or database constraint"),
  401: errorResponse("Authentication required"),
  403: errorResponse("Forbidden"),
  404: errorResponse("Resource not found"),
  409: errorResponse("Request conflicts with the current resource state"),
  500: errorResponse("Internal server error"),
};

type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "RESOURCE_NOT_FOUND"
  | "DUPLICATE_RESOURCE"
  | "RESOURCE_IN_USE"
  | "INVALID_STATUS_TRANSITION"
  | "SCHEDULE_CONFLICT"
  | "PAYMENT_REQUIRED";

type DatabaseError = {
  code?: unknown;
  cause?: unknown;
};

function getDatabaseCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const candidate = error as DatabaseError;
  if (typeof candidate.code === "string") return candidate.code;
  return getDatabaseCode(candidate.cause);
}

export function databaseErrorResponse(error: unknown): Response | undefined {
  switch (getDatabaseCode(error)) {
    case "23505":
      return Response.json(
        { error: { code: "DUPLICATE_RESOURCE", message: "Resource already exists" } },
        { status: 409 },
      );
    case "23503":
      return Response.json(
        { error: { code: "RESOURCE_NOT_FOUND", message: "Referenced resource not found" } },
        { status: 404 },
      );
    case "22P02":
    case "23502":
    case "23514":
      return Response.json(
        { error: { code: "VALIDATION_ERROR", message: "Data violates a database constraint" } },
        { status: 400 },
      );
    case "22012":
      return Response.json(
        { error: { code: "PAYMENT_REQUIRED", message: "No available paid lesson balance" } },
        { status: 409 },
      );
    default:
      return undefined;
  }
}

export async function addRequestIdToResponse(
  response: Response,
  requestId: string,
): Promise<Response> {
  const headers = new Headers(response.headers);
  headers.set("X-Request-Id", requestId);

  if (headers.get("content-type")?.includes("application/json")) {
    try {
      const payload = (await response.clone().json()) as {
        error?: Record<string, unknown>;
      };
      if (payload.error) {
        payload.error.requestId = requestId;
        return new Response(JSON.stringify(payload), {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      }
    } catch {
      // Preserve non-standard error bodies while still adding the correlation header.
    }
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function throwApiError(
  status: 400 | 401 | 403 | 404 | 409,
  code: ApiErrorCode,
  message: string,
  details?: Record<string, unknown>,
): never {
  throw new HTTPException(status, {
    res: Response.json({ error: { code, message, ...(details ? { details } : {}) } }, { status }),
  });
}
