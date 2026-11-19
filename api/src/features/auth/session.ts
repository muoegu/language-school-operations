import type { Database } from "../../db/client.js";
import { throwApiError } from "../../shared/errors.js";
import { getCurrentUser, getSessionSecret, getSessionUserId } from "./service.js";

export type CurrentUser = Awaited<ReturnType<typeof getCurrentUser>>;

export function getCookie(request: Request, name: string) {
  const cookies = request.headers.get("Cookie")?.split(";") ?? [];
  const prefix = `${name}=`;
  return cookies
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(prefix))
    ?.slice(prefix.length);
}

export async function requireCurrentUser(
  db: Database,
  request: Request,
  env: { DEMO_SESSION_SECRET?: string; NODE_ENV?: string },
) {
  const session = await getSessionUserId(
    getCookie(request, "portfolio_session"),
    getSessionSecret(env),
  );
  if (!session) throwApiError(401, "UNAUTHORIZED", "Authentication required");
  return getCurrentUser(db, session);
}

export function requireRole(user: CurrentUser, roles: readonly CurrentUser["role"][]) {
  if (!roles.includes(user.role)) {
    throwApiError(403, "FORBIDDEN", "You do not have permission to perform this action");
  }
  return user;
}

export function canViewAllSchedule(role: string) {
  return role === "representative" || role === "staff";
}

export function canViewAllRecords(role: string) {
  return role === "representative";
}

export function canManageSchedule(role: string) {
  return role === "representative" || role === "staff" || role === "teacher";
}
