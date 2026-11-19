import { describe, expect, it } from "vitest";

import { createSessionCookie, getSessionUserId } from "../src/features/auth/service.js";
import {
  canManageSchedule,
  canViewAllRecords,
  canViewAllSchedule,
  getCookie,
  requireRole,
} from "../src/features/auth/session.js";

describe("demo session", () => {
  it("round-trips a signed session cookie", async () => {
    const cookie = await createSessionCookie(
      "00000000-0000-0000-0000-000000000001",
      "test-secret",
    );

    await expect(getSessionUserId(cookie, "test-secret")).resolves.toBe(
      "00000000-0000-0000-0000-000000000001",
    );
  });

  it("rejects a tampered or differently signed cookie", async () => {
    const cookie = await createSessionCookie(
      "00000000-0000-0000-0000-000000000001",
      "test-secret",
    );
    const [payload, , signature] = cookie.split(".");

    await expect(getSessionUserId(`${payload}.x${signature}`, "test-secret")).resolves.toBeUndefined();
    await expect(getSessionUserId(cookie, "another-secret")).resolves.toBeUndefined();
  });

  it("reads the named cookie without confusing similarly named cookies", () => {
    const request = new Request("http://localhost", {
      headers: { Cookie: "other=value; portfolio_session=session-value; portfolio_session_old=old" },
    });

    expect(getCookie(request, "portfolio_session")).toBe("session-value");
  });

  it("separates schedule and lesson-record permissions by role", () => {
    expect(canViewAllSchedule("teacher")).toBe(false);
    expect(canViewAllSchedule("staff")).toBe(true);
    expect(canViewAllSchedule("representative")).toBe(true);
    expect(canViewAllRecords("staff")).toBe(false);
    expect(canViewAllRecords("representative")).toBe(true);
    expect(canManageSchedule("staff")).toBe(true);
    expect(canManageSchedule("teacher")).toBe(true);
  });

  it("allows only the requested roles", () => {
    const representative = { role: "representative" } as Parameters<typeof requireRole>[0];
    expect(() => requireRole(representative, ["representative"])).not.toThrow();
    expect(() => requireRole(representative, ["teacher"])).toThrow();
  });
});
