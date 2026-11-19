import { z } from "@hono/zod-openapi";

const StudentAlertBaseSchema = z.object({
  studentId: z.string().uuid(),
  studentName: z.string(),
});

const NoRecentLessonAlertSchema = StudentAlertBaseSchema.extend({
  type: z.literal("no_recent_lesson"),
  lastLessonDate: z.iso.date().nullable(),
  daysSinceLastLesson: z.number().int().min(0),
}).openapi("NoRecentLessonAlert");

const OverduePaymentAlertSchema = StudentAlertBaseSchema.extend({
  type: z.literal("overdue_payment"),
  dueDate: z.iso.date(),
  daysOverdue: z.number().int().min(1),
  totalAmountMinor: z.number().int().min(0),
  currency: z.string(),
}).openapi("OverduePaymentAlert");

const UpcomingBirthdayAlertSchema = StudentAlertBaseSchema.extend({
  type: z.literal("upcoming_birthday"),
  birthDate: z.iso.date(),
  daysUntilBirthday: z.number().int().min(0),
}).openapi("UpcomingBirthdayAlert");

export const DashboardAlertsSchema = z.object({
  noRecentLessons: z.array(NoRecentLessonAlertSchema),
  overduePayments: z.array(OverduePaymentAlertSchema),
  upcomingBirthdays: z.array(UpcomingBirthdayAlertSchema),
  generatedAt: z.iso.datetime(),
}).openapi("DashboardAlerts");

export const DashboardAlertsResponseSchema = z.object({ data: DashboardAlertsSchema }).openapi("DashboardAlertsResponse");
