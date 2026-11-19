import { z } from "@hono/zod-openapi";

const UserRoleSchema = z.enum(["representative", "teacher", "staff"]);

export const DemoLoginOptionsSchema = z.object({
  data: z.array(z.object({
    userId: z.string().uuid(),
    displayName: z.string(),
    role: UserRoleSchema,
    teacherId: z.string().uuid().nullable(),
  })),
}).openapi("DemoLoginOptionsResponse");

export const DemoLoginSchema = z.object({
  userId: z.string().uuid().optional(),
  teacherId: z.string().uuid().optional(),
  password: z.string().optional().openapi({ description: "Demo only. Not validated." }),
}).refine((input) => input.userId || input.teacherId, {
  path: ["userId"],
  message: "userId or teacherId is required",
}).openapi("DemoLoginRequest");

export const UserSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  email: z.string().nullable(),
  role: UserRoleSchema,
  teacherId: z.string().uuid().nullable(),
  staffMemberId: z.string().uuid().nullable(),
}).openapi("CurrentUser");

export const UserResponseSchema = z.object({ data: UserSchema }).openapi("CurrentUserResponse");

export const MeStudentsResponseSchema = z.object({
  data: z.array(z.object({
    id: z.string().uuid(),
    displayName: z.string(),
    email: z.string().nullable(),
    level: z.string().nullable(),
    classId: z.string().uuid().nullable(),
    className: z.string().nullable(),
    assignedAt: z.iso.datetime(),
  })),
}).openapi("MyStudentsResponse");
