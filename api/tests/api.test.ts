import { describe, expect, it } from "vitest";

import app from "../src/app.js";

const env = {
  DATABASE_URL: "https://example.test/neon",
  NODE_ENV: "test",
  DEMO_SESSION_SECRET: "test-secret",
};

describe("API HTTP contract", () => {
  it("returns a health response without a database connection", async () => {
    const response = await app.request("http://localhost/healthz", {}, env);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
    expect(response.headers.get("X-Request-Id")).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
  });

  it("returns a structured 404 response for unknown paths", async () => {
    const response = await app.request("http://localhost/does-not-exist", {}, env);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toMatchObject({ error: { code: "NOT_FOUND" } });
    expect(body.error.requestId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("requires authentication for the current user endpoint", async () => {
    const response = await app.request("http://localhost/me", {}, env);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toMatchObject({ error: { code: "UNAUTHORIZED" } });
  });

  it("marks session responses as non-cacheable", async () => {
    const response = await app.request("http://localhost/auth/logout", { method: "POST" }, env);

    expect(response.status).toBe(204);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("requires authentication before reading lessons", async () => {
    const response = await app.request("http://localhost/lessons", {}, env);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toMatchObject({ error: { code: "UNAUTHORIZED" } });
  });

  it("publishes the OpenAPI document", async () => {
    const response = await app.request("http://localhost/doc", {}, env);
    const document = await response.json();

    expect(response.status).toBe(200);
    expect(document.paths["/auth/demo/login"]).toBeDefined();
    expect(document.paths["/lessons/{lessonId}/record"]).toBeDefined();
    expect(document.paths["/classes"]).toBeDefined();
    expect(document.paths["/textbooks"]).toBeDefined();
    expect(document.paths["/payment-records"]).toBeDefined();
    expect(document.components.securitySchemes.portfolioSession).toMatchObject({
      type: "apiKey",
      in: "cookie",
      name: "portfolio_session",
    });
    expect(document.paths["/dashboard/alerts"].get.security).toEqual([{ portfolioSession: [] }]);
    expect(document.paths["/reports/payment-records"].get.security).toEqual([{ portfolioSession: [] }]);
    expect(document.paths["/lessons"].get.security).toEqual([{ portfolioSession: [] }]);
    expect(document.paths["/lessons/{lessonId}/record"].post.security).toEqual([{ portfolioSession: [] }]);
    expect(document.paths["/me"].get.security).toEqual([{ portfolioSession: [] }]);
    expect(document.paths["/me/students"].get.security).toEqual([{ portfolioSession: [] }]);
    expect(document.paths["/classes"].get.security).toEqual([{ portfolioSession: [] }]);
    expect(document.paths["/textbooks"].post.security).toEqual([{ portfolioSession: [] }]);
    expect(document.paths["/payment-records"].get.security).toEqual([{ portfolioSession: [] }]);
    expect(document.paths["/students"].get.security).toEqual([{ portfolioSession: [] }]);
    expect(document.paths["/teachers"].get.security).toEqual([{ portfolioSession: [] }]);
    expect(document.paths["/attendance-records"].get.security).toEqual([{ portfolioSession: [] }]);
  });

  it("adds CORS headers only for configured local origins", async () => {
    const allowed = await app.request("http://localhost/healthz", {
      headers: { Origin: "http://localhost:5173" },
    }, env);
    const rejected = await app.request("http://localhost/healthz", {
      headers: { Origin: "https://malicious.example" },
    }, env);

    expect(allowed.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:5173");
    expect(rejected.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});
