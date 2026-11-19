import { z } from 'zod'

export const studentFormSchema = z.object({
  displayName: z.string().trim().min(1),
  email: z.string().trim().email().or(z.literal('')),
  level: z.string().trim(),
})

export const teacherFormSchema = z.object({
  displayName: z.string().trim().min(1),
  email: z.string().trim().email().or(z.literal('')),
  employmentStartDate: z.string().min(1),
  employmentEndDate: z.string().nullable(),
})

export const textbookFormSchema = z.object({
  title: z.string().trim().min(1),
  publisher: z.string().trim().min(1),
  priceMinor: z.number().finite().nonnegative(),
})

export const lessonPriceFormSchema = z.object({
  name: z.string().trim().min(1),
  level: z.string().trim(),
  durationMinutes: z.number().finite().int().positive(),
  priceMinor: z.number().finite().nonnegative(),
})

export const lessonFormSchema = z.object({
  teacherIds: z.array(z.string()).min(1),
  studentIds: z.array(z.string()).min(1),
  classId: z.string().min(1),
  title: z.string().trim().min(1),
  scheduledStart: z.string().min(1),
  scheduledEnd: z.string().min(1),
})

export const paymentRecordFormSchema = z.object({
  classId: z.string().min(1),
  textbookIds: z.array(z.string()),
})

export const attendanceFormSchema = z.object({
  attendanceDate: z.string().min(1),
  clockInAt: z.string().nullable(),
  clockOutAt: z.string().nullable(),
  status: z.enum(['present', 'late', 'absent']),
  note: z.string().nullable(),
})

export const lessonRecordFormSchema = z.object({
  outcome: z.enum(['completed', 'absent', 'cancelled']),
  actualStart: z.string().nullable(),
  actualEnd: z.string().nullable(),
  note: z.string().nullable(),
  nextContent: z.string().nullable(),
})

export const loginFormSchema = z.object({
  userId: z.string().min(1),
})
