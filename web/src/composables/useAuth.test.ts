import { describe, expect, it } from 'vitest'

import type { CurrentUser } from '../api/generated/types/CurrentUser'
import { useAuth } from './useAuth'

function createUser(role: CurrentUser['role']): CurrentUser {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    displayName: 'テスト 利用者',
    email: 'test@example.test',
    role,
    teacherId: role === 'teacher' ? '00000000-0000-4000-8000-000000000002' : null,
    staffMemberId: role === 'staff' ? '00000000-0000-4000-8000-000000000003' : null,
  }
}

describe('useAuth', () => {
  it('代表にはすべての管理権限を付与する', () => {
    const auth = useAuth()
    auth.setCurrentUser(createUser('representative'))

    expect(auth.isRepresentative.value).toBe(true)
    expect(auth.canManageTeachers.value).toBe(true)
    expect(auth.canViewPaymentData.value).toBe(true)
    expect(auth.canViewLessonRecords.value).toBe(true)
  })

  it('講師には授業記録の閲覧を許可し、支払い情報を制限する', () => {
    const auth = useAuth()
    auth.setCurrentUser(createUser('teacher'))

    expect(auth.isTeacher.value).toBe(true)
    expect(auth.canManageSchedule.value).toBe(true)
    expect(auth.canViewLessonRecords.value).toBe(true)
    expect(auth.canViewPaymentData.value).toBe(false)
    expect(auth.canManageTeachers.value).toBe(false)
  })

  it('スタッフには予定管理を許可し、授業記録と支払い情報を制限する', () => {
    const auth = useAuth()
    auth.setCurrentUser(createUser('staff'))

    expect(auth.isStaff.value).toBe(true)
    expect(auth.canManageSchedule.value).toBe(true)
    expect(auth.canViewLessonRecords.value).toBe(false)
    expect(auth.canViewPaymentData.value).toBe(false)
  })
})
