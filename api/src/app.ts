import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";

import { registerLessonRoutes } from "./features/lessons/routes.js";
import { registerAuthRoutes } from "./features/auth/routes.js";
import { registerLessonRecordRoutes } from "./features/lesson-records/routes.js";
import { registerPaymentRecordRoutes } from "./features/payment-records/routes.js";
import { registerStudentRoutes } from "./features/students/routes.js";
import { registerTeacherRoutes } from "./features/teachers/routes.js";
import { registerLessonTypeRoutes } from "./features/lesson-types/routes.js";
import { registerTextbookRoutes } from "./features/textbooks/routes.js";
import { registerDashboardAlertRoutes } from "./features/dashboard-alerts/routes.js";
import { registerAttendanceRoutes } from "./features/attendance/routes.js";
import { registerPaymentReportRoutes } from "./features/payment-reports/routes.js";
import { registerDocsRoutes } from "./routes/docs.js";
import { registerSystemRoutes } from "./routes/system.js";
import {
  addRequestIdToResponse,
  databaseErrorResponse,
} from "./shared/errors.js";
import type { AppEnv } from "./types.js";

export const app = new OpenAPIHono<AppEnv>();

const localOrigins = ["http://localhost:5173", "http://localhost:4173"];

function getAllowedOrigins(env: AppEnv["Bindings"]) {
  if (env.CORS_ORIGIN) {
    return env.CORS_ORIGIN
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  return env.NODE_ENV === "production" ? [] : localOrigins;
}

app.use("*", async (c, next) => {
  const requestId = crypto.randomUUID();
  const startedAt = performance.now();
  c.set("requestId", requestId);
  c.header("X-Request-Id", requestId);

  await next();

  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "no-referrer");
  console.log(
    JSON.stringify({
      message: "API request completed",
      requestId,
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs: Math.round(performance.now() - startedAt),
    }),
  );
});

app.use("*", async (c, next) => {
  const allowedOrigins = getAllowedOrigins(c.env);
  const corsMiddleware = cors({
    origin: (origin) => (allowedOrigins.includes(origin) ? origin : ""),
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    maxAge: 600,
  });

  return corsMiddleware(c, next);
});

app.onError(async (error, c) => {
  const requestId = c.get("requestId");

  if (error instanceof HTTPException) {
    return addRequestIdToResponse(error.getResponse(), requestId);
  }

  const databaseResponse = databaseErrorResponse(error);
  if (databaseResponse) {
    return addRequestIdToResponse(databaseResponse, requestId);
  }

  console.error(
    JSON.stringify({
      message: "Unhandled API error",
      requestId,
      method: c.req.method,
      error: error instanceof Error ? error.message : String(error),
      path: c.req.path,
    }),
  );
  return c.json(
    {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
        requestId,
      },
    },
    500,
  );
});

app.notFound((c) =>
  c.json(
    {
      error: {
        code: "NOT_FOUND",
        message: "Not found",
        requestId: c.get("requestId"),
      },
    },
    404,
  ),
);

registerSystemRoutes(app);
registerAuthRoutes(app);
registerLessonRoutes(app);
registerLessonRecordRoutes(app);
registerPaymentRecordRoutes(app);
registerStudentRoutes(app);
registerTeacherRoutes(app);
registerLessonTypeRoutes(app);
registerTextbookRoutes(app);
registerDashboardAlertRoutes(app);
registerAttendanceRoutes(app);
registerPaymentReportRoutes(app);
registerDocsRoutes(app);

export default app;
