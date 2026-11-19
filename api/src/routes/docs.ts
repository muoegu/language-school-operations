import { swaggerUI } from "@hono/swagger-ui";
import type { OpenAPIHono } from "@hono/zod-openapi";

import type { AppEnv } from "../types.js";

export function registerDocsRoutes(app: OpenAPIHono<AppEnv>) {
  app.get("/docs", swaggerUI({ url: "/api/v1/doc" }));
  app.openAPIRegistry.registerComponent("securitySchemes", "portfolioSession", {
    type: "apiKey",
    in: "cookie",
    name: "portfolio_session",
    description: "Demo loginで発行されるHttpOnlyセッションCookie",
  });

  app.doc("/doc", {
    openapi: "3.0.0",
    info: {
      title: "Portfolio System API",
      version: "0.1.0",
      description: "語学学校向けポートフォリオ業務管理API",
    },
    servers: [{ url: "/api/v1" }],
  });
}
