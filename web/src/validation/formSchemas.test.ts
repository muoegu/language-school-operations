import { describe, expect, it } from 'vitest'

import { attendanceFormSchema, lessonFormSchema, studentFormSchema, teacherFormSchema } from './formSchemas'

describe('studentFormSchema', () => {
  it('空メールアドレスを許可する', () => {
    expect(studentFormSchema.safeParse({ displayName: '山田 花子', email: '', level: '初級' }).success).toBe(true)
  })

  it('不正なメールアドレスを拒否する', () => {
    expect(
      studentFormSchema.safeParse({ displayName: '山田 花子', email: 'invalid-email', level: '初級' }).success,
    ).toBe(false)
  })
})

describe('teacherFormSchema', () => {
  it('勤務開始日を必須にする', () => {
    const result = teacherFormSchema.safeParse({
      displayName: '田中 愛子',
      email: 'aiko@example.test',
      employmentStartDate: '',
      employmentEndDate: null,
    })

    expect(result.success).toBe(false)
  })
})

describe('lessonFormSchema', () => {
  it('講師と生徒を少なくとも1人ずつ要求する', () => {
    const result = lessonFormSchema.safeParse({
      teacherIds: [],
      studentIds: [],
      classId: 'class-1',
      title: '会話レッスン',
      scheduledStart: '2026-11-19T10:00:00+09:00',
      scheduledEnd: '2026-11-19T11:00:00+09:00',
    })

    expect(result.success).toBe(false)
  })

  it('講師と生徒が指定されたレッスンを受け付ける', () => {
    expect(
      lessonFormSchema.safeParse({
        teacherIds: ['teacher-1'],
        studentIds: ['student-1'],
        classId: 'class-1',
        title: '会話レッスン',
        scheduledStart: '2026-11-19T10:00:00+09:00',
        scheduledEnd: '2026-11-19T11:00:00+09:00',
      }).success,
    ).toBe(true)
  })
})

describe('attendanceFormSchema', () => {
  it('定義されていない出勤ステータスを拒否する', () => {
    expect(
      attendanceFormSchema.safeParse({
        attendanceDate: '2026-11-19',
        clockInAt: null,
        clockOutAt: null,
        status: 'remote',
        note: null,
      }).success,
    ).toBe(false)
  })
})
