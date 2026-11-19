<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  useGetCalendarLessons,
  useGetDashboardAlerts,
  useGetLessons,
  useGetStudents,
  useGetTeachers,
} from '../api/generated/hooks'
import LessonCalendar, { type LessonCalendarItem } from '../components/lessons/LessonCalendar.vue'
import { useAuth } from '../composables/useAuth'
import { formatDate, formatTime } from '../utils/formatters'

const { t } = useI18n()

const router = useRouter()

const { currentUser, isTeacher, isRepresentative, isStaff, canViewStudents, canViewTeachers } = useAuth()

const now = new Date()

const calendarRange = ref({
  from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
  to: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
})

const lessonsQuery = useGetLessons({ query: { page: 1, pageSize: 100 } })

const calendarQuery = useGetCalendarLessons({ query: computed(() => calendarRange.value) })

const teachersQuery = useGetTeachers({}, { query: { enabled: canViewTeachers } })

const studentsQuery = useGetStudents({}, { query: { enabled: canViewStudents } })

const alertsQuery = useGetDashboardAlerts({ query: { enabled: isRepresentative } })

const teacherMap = computed(
  () => new Map((teachersQuery.data.value?.data ?? []).map((teacher) => [teacher.id, teacher.displayName])),
)

const studentMap = computed(
  () => new Map((studentsQuery.data.value?.data ?? []).map((student) => [student.id, student.displayName])),
)

const calendarLessons = computed<LessonCalendarItem[]>(() =>
  (calendarQuery.data.value?.data ?? []).map((lesson) => ({
    id: lesson.id,
    title: lesson.title,
    scheduledStart: lesson.scheduledStart,
    scheduledEnd: lesson.scheduledEnd,
    status: lesson.status,
    teacherName: lesson.teacherNames.join(', ') || '—',
    studentName: lesson.studentNames.join(', ') || '—',
    statusLabel: lesson.status,
  })),
)

function updateCalendarRange(period: { from: string; to: string }) {
  calendarRange.value = period
}
const isTeacherDashboard = computed(() => isTeacher.value)

const isScheduleDashboard = computed(() => isRepresentative.value || isTeacher.value || isStaff.value)

const isManagementDashboard = computed(() => isRepresentative.value)
function localDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value)

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const todayLessons = computed(() => {
  const today = localDateKey(new Date())

  return (lessonsQuery.data.value?.data ?? [])
    .filter((lesson) => lesson.status !== 'cancelled' && localDateKey(lesson.scheduledStart) === today)
    .sort((left, right) => new Date(left.scheduledStart).getTime() - new Date(right.scheduledStart).getTime())
    .map((lesson) => ({
      id: lesson.id,
      startsAt: lesson.scheduledStart,
      title: lesson.title,
      teacherName:
        lesson.teacherIds
          .map((id) => teacherMap.value.get(id))
          .filter(Boolean)
          .join('、') ||
        (isTeacher.value ? currentUser.value?.displayName : undefined) ||
        '—',
      studentName:
        lesson.studentIds
          .map((id) => studentMap.value.get(id))
          .filter(Boolean)
          .join(', ') || '—',
      duration: `${Math.round((new Date(lesson.scheduledEnd).getTime() - new Date(lesson.scheduledStart).getTime()) / 60000)}分`,
    }))
})

const tasks = computed(() => {
  const now = Date.now()

  const lessons = lessonsQuery.data.value?.data ?? []

  const lessonTasks = lessons
    .filter(
      (lesson) => lesson.status !== 'cancelled' && new Date(lesson.scheduledEnd).getTime() < now && !lesson.record,
    )
    .map((lesson) => ({
      id: `record-${lesson.id}`,
      lessonId: lesson.id,
      title: `${
        lesson.studentIds
          .map((id) => studentMap.value.get(id))
          .filter(Boolean)
          .join('、') || '生徒'
      }さんの授業記録を入力する`,
      due: formatDate(lesson.scheduledStart),
      icon: 'i-lucide-file-pen-line',
    }))

  const preparationTasks = lessons
    .filter(
      (lesson) =>
        lesson.status !== 'cancelled' &&
        new Date(lesson.scheduledEnd).getTime() < now &&
        Boolean(lesson.record) &&
        !lesson.record?.nextContent?.trim(),
    )
    .map((lesson) => ({
      id: `preparation-${lesson.id}`,
      lessonId: lesson.id,
      title: '次回レッスンの準備をする',
      due: formatDate(lesson.scheduledStart),
      icon: 'i-lucide-book-open-check',
    }))

  return [...lessonTasks, ...preparationTasks]
})

const alerts = computed(() => {
  const data = alertsQuery.data.value?.data
  if (!data) return []

  return [
    ...data.noRecentLessons.map((alert) => ({
      id: `${alert.type}-${alert.studentId}`,
      studentId: alert.studentId,
      name: alert.studentName,
      detail: `${alert.daysSinceLastLesson}日間レッスンがありません`,
      dateLabel: '前回のレッスン日',
      date: alert.lastLessonDate ? formatDate(alert.lastLessonDate) : '未実施',
      icon: 'i-lucide-user-round-x',
      color: 'amber',
    })),
    ...data.overduePayments.map((alert) => ({
      id: `${alert.type}-${alert.studentId}-${alert.dueDate}`,
      studentId: alert.studentId,
      name: alert.studentName,
      detail: `${alert.daysOverdue}日超過・支払い未確認`,
      dateLabel: '支払いの締切日',
      date: formatDate(alert.dueDate),
      icon: 'i-lucide-circle-alert',
      color: 'rose',
    })),
    ...data.upcomingBirthdays.map((alert) => ({
      id: `${alert.type}-${alert.studentId}`,
      studentId: alert.studentId,
      name: alert.studentName,
      detail: `誕生日まであと${alert.daysUntilBirthday}日です`,
      dateLabel: '誕生日',
      date: formatDate(alert.birthDate),
      icon: 'i-lucide-cake',
      color: 'violet',
    })),
  ].slice(0, 6)
})

function formatUpcomingDay(value: string) {
  const date = new Date(value)

  return `${date.getMonth() + 1}/${date.getDate()}`
}
function formatUpcomingTime(value: string) {
  return formatTime(value)
}
</script>

<template>
  <section class="mx-auto flex max-w-6xl flex-col gap-6">
    <div>
      <h1 class="text-2xl font-semibold text-slate-900">{{ t('dashboard.title') }}</h1>
      <p class="mt-2 text-sm text-slate-500">
        {{ t('dashboard.description') }}
      </p>
    </div>

    <section
      v-if="isScheduleDashboard"
      class="grid gap-6"
      :class="isTeacherDashboard ? 'lg:grid-cols-[1.2fr_0.8fr]' : ''"
    >
      <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold text-slate-900">{{ t('dashboard.todayLessons') }}</h2>
            <p class="mt-1 text-sm text-slate-500">{{ t('dashboard.todayLessonsDescription') }}</p>
          </div>
          <UIcon name="i-lucide-calendar-clock" class="size-5 text-sky-600" />
        </div>
        <div class="flex flex-col divide-y divide-slate-100">
          <button
            v-for="lesson in todayLessons"
            :key="lesson.id"
            type="button"
            class="flex w-full min-w-0 items-center gap-4 py-4 text-left first:pt-0 last:pb-0 hover:bg-slate-50"
            @click="router.push(`/lessons/${lesson.id}`)"
          >
            <div
              class="flex w-16 shrink-0 flex-col items-center justify-center rounded-lg bg-sky-50 px-1.5 py-2 text-sky-700"
            >
              <span class="whitespace-nowrap text-xs">{{ formatUpcomingDay(lesson.startsAt) }}</span><span
                class="whitespace-nowrap text-sm font-semibold"
                >{{ formatUpcomingTime(lesson.startsAt) }}</span
              >
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-slate-900">{{ lesson.title }}</p>
              <p class="mt-1 text-xs text-slate-500">
                講師：{{ lesson.teacherName }} · 生徒：{{ lesson.studentName }} · {{ lesson.duration }}
              </p>
            </div>
            <UIcon name="i-lucide-chevron-right" class="size-4 text-slate-400" />
          </button>
          <p v-if="todayLessons.length === 0" class="py-4 text-sm text-slate-500">本日のレッスンはありません。</p>
        </div>
      </div>

      <div v-if="isTeacherDashboard" class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold text-slate-900">{{ t('dashboard.tasks') }}</h2>
            <p class="mt-1 text-sm text-slate-500">{{ t('dashboard.tasksDescription') }}</p>
          </div>
          <UIcon name="i-lucide-list-checks" class="size-5 text-sky-600" />
        </div>
        <div class="flex flex-col gap-3">
          <button
            v-for="task in tasks"
            :key="task.id"
            type="button"
            class="flex items-start gap-3 rounded-lg p-2 text-left hover:bg-slate-50"
            @click="router.push(`/lessons/${task.lessonId}`)"
          >
            <span
              class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-sky-600"
              ><UIcon :name="task.icon" class="size-3.5" /></span
            ><span class="min-w-0 flex-1"
              ><span class="block text-sm text-slate-700">{{ task.title }}</span
              ><span class="mt-1 block text-xs text-slate-400">{{ task.due }}</span></span
            ><UIcon name="i-lucide-chevron-right" class="mt-1 size-4 text-slate-400" />
          </button>
          <p v-if="tasks.length === 0" class="py-2 text-sm text-slate-500">対応が必要なタスクはありません。</p>
        </div>
      </div>
    </section>

    <section v-if="isManagementDashboard" class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 class="text-lg font-semibold text-slate-900">{{ t('dashboard.alertsTitle') }}</h2>
          <p class="mt-1 text-sm text-slate-500">{{ t('dashboard.alertsDescription') }}</p>
        </div>
      </div>
      <div class="grid gap-4 md:grid-cols-3">
        <button
          v-for="alert in alerts"
          :key="alert.id"
          type="button"
          class="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 text-left transition duration-200 hover:-translate-y-1 hover:border-sky-200 hover:bg-sky-50/30 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 active:translate-y-0 active:shadow-sm"
          @click="router.push(`/students/${alert.studentId}`)"
        >
          <div class="flex items-start justify-between gap-3">
            <div
              class="flex size-10 items-center justify-center rounded-lg"
              :class="{
                'bg-amber-50 text-amber-600': alert.color === 'amber',
                'bg-rose-50 text-rose-600': alert.color === 'rose',
                'bg-violet-50 text-violet-600': alert.color === 'violet',
              }"
            >
              <UIcon :name="alert.icon" class="size-5" />
            </div>
            <UIcon
              name="i-lucide-arrow-up-right"
              class="size-4 text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-sky-600"
            />
          </div>
          <p class="mt-4 text-sm font-semibold text-slate-900">{{ alert.name }}</p>
          <p class="mt-1 text-sm leading-6 text-slate-500">{{ alert.detail }}</p>
          <p class="mt-3 text-xs text-slate-400">{{ alert.dateLabel }}</p>
          <p class="text-sm font-medium text-slate-700">{{ alert.date }}</p>
        </button>
      </div>
    </section>

    <section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 class="text-lg font-semibold text-slate-900">{{ t('dashboard.calendarTitle') }}</h2>
          <p class="mt-1 text-sm text-slate-500">{{ t('dashboard.calendarDescription') }}</p>
        </div>
        <UButton
          :label="t('dashboard.viewAllLessons')"
          color="neutral"
          variant="outline"
          icon="i-lucide-arrow-right"
          trailing
          @click="router.push('/lessons')"
        />
      </div>
      <UAlert
        v-if="lessonsQuery.isError.value || calendarQuery.isError.value || alertsQuery.isError.value"
        color="error"
        :title="t('api.lessonFetchFailed')"
        :description="t('api.serverCheck')"
      />
      <LessonCalendar
        v-else
        :lessons="calendarLessons"
        @period-change="updateCalendarRange"
        @select="(lesson) => router.push(`/lessons/${lesson.id}`)"
      />
    </section>
  </section>
</template>
