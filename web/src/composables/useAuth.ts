import { computed, shallowRef } from 'vue'

import { getMe } from '../api/generated/clients/getMe'
import { postAuthLogout } from '../api/generated/clients/postAuthLogout'
import type { CurrentUser } from '../api/generated/types/CurrentUser'

const currentUser = shallowRef<CurrentUser | null>(null)
let sessionChecked = false
let sessionCheck: Promise<boolean> | null = null

export function useAuth() {
  const isAuthenticated = computed(() => currentUser.value !== null)
  const role = computed(() => currentUser.value?.role ?? null)
  const isRepresentative = computed(() => role.value === 'representative')
  const isTeacher = computed(() => role.value === 'teacher')
  const isStaff = computed(() => role.value === 'staff')
  const canViewStudents = computed(() => isRepresentative.value || isTeacher.value || isStaff.value)
  const canViewTeachers = computed(() => isRepresentative.value || isTeacher.value || isStaff.value)
  const canViewCatalog = computed(() => isRepresentative.value || isTeacher.value || isStaff.value)
  const canManageSchedule = computed(() => isRepresentative.value || isStaff.value || isTeacher.value)
  const canViewLessonRecords = computed(() => isRepresentative.value || isTeacher.value)
  const canManageTeachers = computed(() => isRepresentative.value)
  const canViewPaymentData = computed(() => isRepresentative.value)

  async function ensureSession() {
    if (sessionChecked) return isAuthenticated.value
    if (sessionCheck) return sessionCheck

    sessionCheck = getMe({ throwOnError: false })
      .then((result) => {
        if (result.status === 200 && result.data) {
          currentUser.value = result.data.data
        } else {
          currentUser.value = null
        }
        sessionChecked = true
        return isAuthenticated.value
      })
      .catch(() => {
        currentUser.value = null
        sessionChecked = true
        return false
      })
      .finally(() => {
        sessionCheck = null
      })

    return sessionCheck
  }

  function setCurrentUser(user: CurrentUser) {
    currentUser.value = user
    sessionChecked = true
  }

  async function logout() {
    await postAuthLogout({ throwOnError: false })
    currentUser.value = null
    sessionChecked = true
  }

  return {
    currentUser,
    isAuthenticated,
    role,
    isRepresentative,
    isTeacher,
    isStaff,
    canViewStudents,
    canViewTeachers,
    canViewCatalog,
    canManageSchedule,
    canViewLessonRecords,
    canManageTeachers,
    canViewPaymentData,
    ensureSession,
    setCurrentUser,
    logout,
  }
}
