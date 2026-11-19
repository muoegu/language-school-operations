<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { useGetDashboardAlerts, useGetLessons, useGetStudents, useGetTeachers } from '../../api/generated/hooks'
import { useAuth } from '../../composables/useAuth'
import { formatDateTime } from '../../utils/formatters'

const { t, locale } = useI18n()

const router = useRouter()

const { currentUser, isRepresentative, isTeacher, canViewStudents, canViewTeachers } = useAuth()

const open = ref(false)

const lessonsQuery = useGetLessons(
  { query: { page: 1, pageSize: 100, sortBy: 'scheduledStart', sortOrder: 'desc' } },
  { query: { staleTime: 60_000, refetchInterval: 30_000 } },
)

const studentsQuery = useGetStudents({}, { query: { enabled: canViewStudents, staleTime: 60_000 } })

const teachersQuery = useGetTeachers({}, { query: { enabled: canViewTeachers, staleTime: 60_000 } })

const alertsQuery = useGetDashboardAlerts({ query: { enabled: isRepresentative, staleTime: 60_000 } })

const studentMap = computed(
  () => new Map((studentsQuery.data.value?.data ?? []).map((student) => [student.id, student.displayName])),
)

const teacherMap = computed(
  () => new Map((teachersQuery.data.value?.data ?? []).map((teacher) => [teacher.id, teacher.displayName])),
)

const todayLessons = computed(() => {
  const now = new Date()

  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

  const end = start + 24 * 60 * 60 * 1000

  return (lessonsQuery.data.value?.data ?? [])
    .filter((lesson) => {
      const scheduledStart = new Date(lesson.scheduledStart).getTime()

      return scheduledStart >= start && scheduledStart < end && lesson.status !== 'cancelled'
    })
    .sort((left, right) => new Date(left.scheduledStart).getTime() - new Date(right.scheduledStart).getTime())
})

const customerAlerts = computed(() => {
  const data = alertsQuery.data.value?.data
  if (!data) return []

  return [
    ...data.noRecentLessons.map((alert) => ({
      id: `no-recent-${alert.studentId}`,
      studentId: alert.studentId,
      icon: 'i-lucide-user-round-x',
      color: 'text-amber-600 bg-amber-50',
      title: alert.studentName,
      detail: `${alert.daysSinceLastLesson}日間レッスンがありません`,
    })),
    ...data.overduePayments.map((alert) => ({
      id: `overdue-${alert.studentId}-${alert.dueDate}`,
      studentId: alert.studentId,
      icon: 'i-lucide-circle-alert',
      color: 'text-rose-600 bg-rose-50',
      title: alert.studentName,
      detail: `${alert.daysOverdue}日超過・支払い未確認`,
    })),
    ...data.upcomingBirthdays.map((alert) => ({
      id: `birthday-${alert.studentId}`,
      studentId: alert.studentId,
      icon: 'i-lucide-cake',
      color: 'text-violet-600 bg-violet-50',
      title: alert.studentName,
      detail: `誕生日まであと${alert.daysUntilBirthday}日です`,
    })),
  ].slice(0, 6)
})

const lessonRecordNotifications = computed(() => {
  if (!isRepresentative.value) return []

  const createdAfter = Date.now() - 30 * 24 * 60 * 60 * 1000

  return (lessonsQuery.data.value?.data ?? [])
    .filter((lesson) => {
      return lesson.record !== null && new Date(lesson.record.createdAt).getTime() >= createdAfter
    })
    .sort((left, right) => {
      return new Date(right.record!.createdAt).getTime() - new Date(left.record!.createdAt).getTime()
    })
})

const notificationCount = computed(
  () => todayLessons.value.length + customerAlerts.value.length + lessonRecordNotifications.value.length,
)

function formatLessonTime(value: string) {
  return formatDateTime(value, locale.value, { hour: '2-digit', minute: '2-digit' })
}

function openLesson(lessonId: string) {
  open.value = false
  void router.push(`/lessons/${lessonId}`)
}

function openStudents() {
  open.value = false
  void router.push('/students')
}

function openStudent(studentId: string) {
  open.value = false
  void router.push(`/students/${studentId}`)
}

function openLessons() {
  open.value = false
  void router.push('/lessons')
}
</script>

<template>
  <UPopover v-model:open="open" :content="{ align: 'end', sideOffset: 8 }">
    <button
      type="button"
      class="relative inline-flex size-10 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
      :aria-label="t('notifications.open')"
      :aria-expanded="open"
    >
      <UIcon name="i-lucide-bell" class="size-6" />
      <span
        v-if="notificationCount > 0"
        class="absolute right-0.5 top-0.5 flex min-w-5 translate-x-1/4 -translate-y-1/4 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-white"
      >
        {{ notificationCount > 99 ? '99+' : notificationCount }}
      </span>
    </button>

    <template #content>
      <div class="w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl bg-white">
        <div class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <p class="font-semibold text-slate-900">{{ t('notifications.title') }}</p>
            <p class="mt-0.5 text-xs text-slate-500">{{ t('notifications.description') }}</p>
          </div>
          <UBadge v-if="notificationCount > 0" :label="String(notificationCount)" color="primary" variant="soft" />
        </div>

        <div
          v-if="lessonsQuery.isLoading.value || alertsQuery.isLoading.value"
          class="px-4 py-6 text-center text-sm text-slate-500"
        >
          {{ t('notifications.loading') }}
        </div>
        <div
          v-else-if="lessonsQuery.isError.value || alertsQuery.isError.value"
          class="px-4 py-6 text-center text-sm text-rose-600"
        >
          {{ t('notifications.fetchFailed') }}
        </div>
        <div v-else-if="notificationCount === 0" class="px-4 py-8 text-center text-sm text-slate-500">
          {{ t('notifications.empty') }}
        </div>
        <div v-else class="max-h-[min(32rem,70vh)] overflow-y-auto">
          <section v-if="todayLessons.length > 0" class="border-b border-slate-100 p-3">
            <div class="mb-2 flex items-center justify-between px-1">
              <h2 class="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {{ t('notifications.todaySchedule') }}
              </h2>
              <button type="button" class="text-xs font-medium text-sky-700 hover:text-sky-900" @click="openLessons">
                {{ t('notifications.viewAll') }}
              </button>
            </div>
            <button
              v-for="lesson in todayLessons"
              :key="lesson.id"
              type="button"
              class="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-50"
              @click="openLesson(lesson.id)"
            >
              <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700"
                ><UIcon name="i-lucide-calendar-clock" class="size-4"
              /></span>
              <span class="min-w-0 flex-1"
                ><span class="block truncate text-sm font-medium text-slate-800">{{ lesson.title }}</span
                ><span class="mt-0.5 block text-xs text-slate-500"
                  >{{ formatLessonTime(lesson.scheduledStart) }} · 講師：{{
                    lesson.teacherIds
                      .map((id) => teacherMap.get(id))
                      .filter(Boolean)
                      .join('、') ||
                    (isTeacher ? currentUser?.displayName : undefined) ||
                    '—'
                  }}
                  · 生徒：{{
                    lesson.studentIds
                      .map((id) => studentMap.get(id))
                      .filter(Boolean)
                      .join('、') || '—'
                  }}</span
                ></span
              >
              <UIcon name="i-lucide-chevron-right" class="size-4 shrink-0 text-slate-400" />
            </button>
          </section>

          <section v-if="lessonRecordNotifications.length > 0" class="border-b border-slate-100 p-3">
            <div class="mb-2 flex items-center justify-between px-1">
              <h2 class="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {{ t('notifications.lessonRecords') }}
              </h2>
              <button type="button" class="text-xs font-medium text-sky-700 hover:text-sky-900" @click="openLessons">
                {{ t('notifications.viewAll') }}
              </button>
            </div>
            <button
              v-for="lesson in lessonRecordNotifications"
              :key="`lesson-record-${lesson.id}`"
              type="button"
              class="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-50"
              @click="openLesson(lesson.id)"
            >
              <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <UIcon name="i-lucide-file-check-2" class="size-4" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-medium text-slate-800">
                  {{ t('notifications.lessonRecordCreated') }}
                </span>
                <span class="mt-0.5 block truncate text-xs text-slate-500">
                  {{ lesson.title }} · {{ formatDateTime(lesson.record!.createdAt, locale) }}
                </span>
              </span>
              <UIcon name="i-lucide-chevron-right" class="size-4 shrink-0 text-slate-400" />
            </button>
          </section>

          <section v-if="customerAlerts.length > 0" class="p-3">
            <div class="mb-2 flex items-center justify-between px-1">
              <h2 class="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {{ t('notifications.customerAlerts') }}
              </h2>
              <button type="button" class="text-xs font-medium text-sky-700 hover:text-sky-900" @click="openStudents">
                {{ t('notifications.viewAll') }}
              </button>
            </div>
            <button
              v-for="alert in customerAlerts"
              :key="alert.id"
              type="button"
              class="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-50"
              @click="openStudent(alert.studentId)"
            >
              <span class="flex size-9 shrink-0 items-center justify-center rounded-lg" :class="alert.color"
                ><UIcon :name="alert.icon" class="size-4"
              /></span>
              <span class="min-w-0 flex-1"
                ><span class="block truncate text-sm font-medium text-slate-800">{{ alert.title }}</span
                ><span class="mt-0.5 block text-xs text-slate-500">{{ alert.detail }}</span></span
              >
              <UIcon name="i-lucide-chevron-right" class="size-4 shrink-0 text-slate-400" />
            </button>
          </section>
        </div>
      </div>
    </template>
  </UPopover>
</template>
