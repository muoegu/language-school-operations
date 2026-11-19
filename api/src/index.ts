import "./config/load-env.js";

import { serve } from "@hono/node-server";

import app from "./app.js";
import type { AppEnv } from "./types.js";

const apiPrefix = "/api/v1";
const port = Number(process.env.PORT ?? 3000);
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to start the local API");
}

const env: AppEnv["Bindings"] = {
  DATABASE_URL: databaseUrl,
  NODE_ENV: process.env.NODE_ENV ?? "development",
  CORS_ORIGIN: process.env.CORS_ORIGIN,
};

serve(
  {
    fetch: (request) => {
      const url = new URL(request.url);
      const hasApiPrefix =
        url.pathname === apiPrefix || url.pathname.startsWith(`${apiPrefix}/`);

      if (hasApiPrefix) {
        url.pathname = url.pathname.slice(apiPrefix.length) || "/";
        return app.fetch(new Request(url, request), env);
      }

      return app.fetch(request, env);
    },
    port,
  },
  (info) => {
    console.log(`API server is running on http://localhost:${info.port}`);
    console.log(`Health check: http://localhost:${info.port}${apiPrefix}/healthz`);
  },
);
