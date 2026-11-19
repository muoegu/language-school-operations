import { createRoute, OpenAPIHono } from "@hono/zod-openapi";

import { getDb } from "../../db/client.js";
import type { AppEnv } from "../../types.js";
import { apiErrorResponses, throwApiError } from "../../shared/errors.js";
import {
  createSessionCookie,
  getCurrentUser,
  getSessionSecret,
  getSessionUserId,
  listDemoLoginOptions,
  listMyStudents,
  loginAsDemoUser,
} from "./service.js";
import {
  DemoLoginOptionsSchema,
  DemoLoginSchema,
  MeStudentsResponseSchema,
  UserResponseSchema,
} from "./schema.js";
import { getCookie } from "./session.js";

const sessionCookie = "portfolio_session";

export function registerAuthRoutes(app: OpenAPIHono<AppEnv>) {
  const optionsRoute = createRoute({
    method: "get", path: "/auth/demo/options", tags: ["auth"],
    responses: { 200: { content: { "application/json": { schema: DemoLoginOptionsSchema } }, description: "Demo login options" }, ...apiErrorResponses },
  });
  app.openapi(optionsRoute, async (c) => {
    c.header("Cache-Control", "no-store");
    return c.json(await listDemoLoginOptions(getDb(c.env)), 200);
  });

  const loginRoute = createRoute({
    method: "post", path: "/auth/demo/login", tags: ["auth"],
    request: { body: { content: { "application/json": { schema: DemoLoginSchema } }, required: true } },
    responses: { 200: { content: { "application/json": { schema: UserResponseSchema } }, description: "Demo login succeeded" }, ...apiErrorResponses },
  });
  app.openapi(loginRoute, async (c) => {
    const input = c.req.valid("json");
    const db = getDb(c.env);
    const userId = await loginAsDemoUser(db, input);
    const cookie = await createSessionCookie(userId, getSessionSecret(c.env));
    c.header("Cache-Control", "no-store");
    c.header("Set-Cookie", `${sessionCookie}=${cookie}; HttpOnly; Path=/; SameSite=Lax; Max-Age=28800${c.env.NODE_ENV === "production" ? "; Secure" : ""}`);
    return c.json({ data: await getCurrentUser(db, userId) }, 200);
  });

  const logoutRoute = createRoute({
    method: "post", path: "/auth/logout", tags: ["auth"],
    responses: { 204: { description: "Logged out" }, ...apiErrorResponses },
  });
  app.openapi(logoutRoute, (c) => {
    c.header("Cache-Control", "no-store");
    c.header("Set-Cookie", `${sessionCookie}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${c.env.NODE_ENV === "production" ? "; Secure" : ""}`);
    return c.body(null, 204);
  });

  const meRoute = createRoute({
    method: "get", path: "/me", tags: ["auth"],
    security: [{ portfolioSession: [] }],
    responses: { 200: { content: { "application/json": { schema: UserResponseSchema } }, description: "Current user" }, ...apiErrorResponses },
  });
  app.openapi(meRoute, async (c) => {
    const userId = await getSessionUserId(getCookie(c.req.raw, sessionCookie), getSessionSecret(c.env));
    if (!userId) throwApiError(401, "UNAUTHORIZED", "Authentication required");
    c.header("Cache-Control", "no-store");
    return c.json({ data: await getCurrentUser(getDb(c.env), userId) }, 200);
  });

  const myStudentsRoute = createRoute({
    method: "get", path: "/me/students", tags: ["auth"],
    security: [{ portfolioSession: [] }],
    responses: { 200: { content: { "application/json": { schema: MeStudentsResponseSchema } }, description: "Students assigned to current teacher" }, ...apiErrorResponses },
  });
  app.openapi(myStudentsRoute, async (c) => {
    const userId = await getSessionUserId(getCookie(c.req.raw, sessionCookie), getSessionSecret(c.env));
    if (!userId) throwApiError(401, "UNAUTHORIZED", "Authentication required");
    c.header("Cache-Control", "no-store");
    return c.json(await listMyStudents(getDb(c.env), userId), 200);
  });
}
