<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { CalendarDate } from '@internationalized/date'

import type { Lesson } from '../../api/generated/types/Lesson'
import { formatDate, formatTime } from '../../utils/formatters'

export type LessonCalendarItem = {
  id: string
  title: string
  scheduledStart: string
  scheduledEnd: string
  status: Lesson['status']
  teacherName: string
  studentName: string
  statusLabel: string
}

const props = defineProps<{
  lessons: LessonCalendarItem[]
}>()

const emit = defineEmits<{
  select: [lesson: LessonCalendarItem]
  'period-change': [period: { from: string; to: string }]
}>()

const { t, tm, locale } = useI18n()

const viewMode = ref<'calendar' | 'week' | 'day'>('calendar')

const calendarAnchor = shallowRef(
  new CalendarDate(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()),
)

const weekDays = computed(() => tm('lessons.weekdays') as string[])

const dayHours = Array.from({ length: 12 }, (_, index) => index + 8)

const periodRange = computed(() => {
  const anchor = new Date(calendarAnchor.value.year, calendarAnchor.value.month - 1, calendarAnchor.value.day)
  let from: Date
  let to: Date

  if (viewMode.value === 'calendar') {
    from = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
    to = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1)
  } else if (viewMode.value === 'week') {
    from = new Date(anchor)
    from.setDate(anchor.getDate() - anchor.getDay())
    to = new Date(from)
    to.setDate(from.getDate() + 7)
  } else {
    from = new Date(anchor)
    to = new Date(anchor)
    to.setDate(anchor.getDate() + 1)
  }

  return { from: from.toISOString(), to: to.toISOString() }
})

watch(periodRange, (period) => emit('period-change', period), { immediate: true })
const todayKey = dateKey(new Date())

const periodLabel = computed(() => {
  const anchor = new Date(calendarAnchor.value.year, calendarAnchor.value.month - 1, calendarAnchor.value.day)
  if (viewMode.value === 'calendar') return formatDate(anchor).slice(0, 7)
  if (viewMode.value === 'week') {
    const start = new Date(anchor)
    start.setDate(anchor.getDate() - anchor.getDay())
    const end = new Date(start)
    end.setDate(start.getDate() + 6)

    return `${formatDate(start)}〜${formatDate(end)}`
  }

  return formatDate(anchor)
})

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const lessonsByDate = computed(() => {
  const grouped = new Map<string, LessonCalendarItem[]>()
  for (const lesson of props.lessons) {
    const key = dateKey(new Date(lesson.scheduledStart))
    grouped.set(key, [...(grouped.get(key) ?? []), lesson])
  }

  return grouped
})

const calendarCells = computed(() => {
  const anchor = new Date(calendarAnchor.value.year, calendarAnchor.value.month - 1, calendarAnchor.value.day)
  let start: Date
  let cellCount: number

  if (viewMode.value === 'calendar') {
    start = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
    start.setDate(1 - start.getDay())
    cellCount = Math.ceil((start.getDay() + new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate()) / 7) * 7
  } else if (viewMode.value === 'week') {
    start = new Date(anchor)
    start.setDate(anchor.getDate() - anchor.getDay())
    cellCount = 7
  } else {
    start = new Date(anchor)
    cellCount = 1
  }

  return Array.from({ length: cellCount }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)

    return {
      key: dateKey(date),
      day: date.getDate(),
      isToday: dateKey(date) === todayKey,
      inMonth: viewMode.value !== 'calendar' || date.getMonth() === anchor.getMonth(),
      lessons:
        viewMode.value === 'calendar' && date.getMonth() !== anchor.getMonth()
          ? []
          : (lessonsByDate.value.get(dateKey(date)) ?? []),
    }
  })
})

const visibleLessonCount = computed(() => calendarCells.value.reduce((total, cell) => total + cell.lessons.length, 0))

const dayLessons = computed(() => calendarCells.value[0]?.lessons ?? [])

function dayLessonStyle(lesson: LessonCalendarItem) {
  const start = new Date(lesson.scheduledStart)

  const end = new Date(lesson.scheduledEnd)

  const startMinutes = Math.max(8 * 60, start.getHours() * 60 + start.getMinutes())

  const endMinutes = Math.min(20 * 60, end.getHours() * 60 + end.getMinutes())

  const top = ((startMinutes - 8 * 60) / 60) * 80 + 4

  const height = Math.max(((Math.max(endMinutes, startMinutes + 30) - startMinutes) / 60) * 80 - 8, 36)

  return { top: `${top}px`, height: `${height}px` }
}

function moveCalendar(direction: -1 | 1) {
  const anchor = new Date(calendarAnchor.value.year, calendarAnchor.value.month - 1, calendarAnchor.value.day)
  if (viewMode.value === 'calendar') {
    anchor.setDate(1)
    anchor.setMonth(anchor.getMonth() + direction)
  } else if (viewMode.value === 'week') {
    anchor.setDate(anchor.getDate() + direction * 7)
  } else {
    anchor.setDate(anchor.getDate() + direction)
  }
  calendarAnchor.value = new CalendarDate(anchor.getFullYear(), anchor.getMonth() + 1, anchor.getDate())
}

function moveToToday() {
  const today = new Date()
  calendarAnchor.value = new CalendarDate(today.getFullYear(), today.getMonth() + 1, today.getDate())
}

function statusClass(status: Lesson['status']) {
  return {
    scheduled: 'border-sky-200 bg-sky-50 text-sky-700',
    completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    absent: 'border-amber-200 bg-amber-50 text-amber-700',
    cancelled: 'border-slate-200 bg-slate-100 text-slate-500',
  }[status]
}
</script>

<template>
  <div class="min-w-0">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <UTooltip :text="t('common.previousPeriod')"
          ><UButton
            icon="i-lucide-chevron-left"
            color="neutral"
            variant="outline"
            :aria-label="t('common.previousPeriod')"
            @click="moveCalendar(-1)"
        /></UTooltip>
        <h2 class="min-w-44 text-center text-lg font-semibold text-slate-900">{{ periodLabel }}</h2>
        <UTooltip :text="t('common.nextPeriod')"
          ><UButton
            icon="i-lucide-chevron-right"
            color="neutral"
            variant="outline"
            :aria-label="t('common.nextPeriod')"
            @click="moveCalendar(1)"
        /></UTooltip>
        <UButton :label="t('common.today')" color="neutral" variant="outline" size="sm" @click="moveToToday" />
      </div>
      <div class="flex items-center gap-3">
        <span class="text-sm text-slate-500">{{ t('lessons.scheduledCount', { count: visibleLessonCount }) }}</span>
        <div class="flex rounded-lg border border-slate-200 bg-white p-1">
          <UButton
            :label="t('lessons.month')"
            :variant="viewMode === 'calendar' ? 'soft' : 'ghost'"
            color="neutral"
            size="sm"
            @click="viewMode = 'calendar'"
          />
          <UButton
            :label="t('lessons.week')"
            :variant="viewMode === 'week' ? 'soft' : 'ghost'"
            color="neutral"
            size="sm"
            @click="viewMode = 'week'"
          />
          <UButton
            :label="t('lessons.day')"
            :variant="viewMode === 'day' ? 'soft' : 'ghost'"
            color="neutral"
            size="sm"
            @click="viewMode = 'day'"
          />
        </div>
      </div>
    </div>

    <div
      v-if="viewMode !== 'day'"
      class="grid overflow-hidden rounded-t-lg border border-b-0 border-slate-200 bg-slate-50 grid-cols-7"
    >
      <div
        v-for="(weekDay, index) in weekDays"
        :key="weekDay"
        class="border-r border-slate-200 px-2 py-2 text-center text-xs font-medium last:border-r-0"
        :class="index === 0 ? 'text-rose-500' : index === 6 ? 'text-sky-600' : 'text-slate-500'"
      >
        {{ weekDay }}
      </div>
    </div>
    <div v-if="viewMode !== 'day'" class="grid overflow-hidden rounded-b-lg border border-slate-200 grid-cols-7">
      <div
        v-for="cell in calendarCells"
        :key="cell.key"
        class="min-h-28 border-r border-t border-slate-200 p-1.5 last:border-r-0 sm:min-h-32"
        :class="cell.isToday ? 'bg-sky-50/60' : ''"
      >
        <span
          class="flex size-6 items-center justify-center rounded-full text-xs"
          :class="
            cell.isToday ? 'bg-sky-600 font-semibold text-white' : cell.inMonth ? 'text-slate-700' : 'text-slate-300'
          "
          >{{ cell.day }}</span
        >
        <div class="mt-1 space-y-1">
          <button
            v-for="lesson in cell.lessons"
            :key="lesson.id"
            type="button"
            class="block w-full overflow-hidden rounded border px-1.5 py-1 text-left text-[11px] leading-4 transition hover:opacity-75"
            :class="statusClass(lesson.status)"
            :title="`${lesson.title} / ${lesson.teacherName} / ${lesson.studentName}`"
            @click="emit('select', lesson)"
          >
            <span class="block truncate">{{ formatTime(lesson.scheduledStart, locale) }} {{ lesson.title }}</span>
            <span class="block truncate text-[10px]">{{ lesson.studentName }} / {{ lesson.teacherName }}</span>
          </button>
        </div>
      </div>
    </div>
    <div v-else class="grid grid-cols-[72px_minmax(0,1fr)] overflow-hidden rounded-lg border border-slate-200">
      <div class="bg-slate-50">
        <div
          v-for="hour in dayHours"
          :key="hour"
          class="h-20 border-b border-slate-200 px-2 pt-1 text-right text-xs text-slate-500 last:border-b-0"
        >
          {{ String(hour).padStart(2, '0') }}:00
        </div>
      </div>
      <div class="relative" :style="{ height: `${dayHours.length * 80}px` }">
        <div
          v-for="(_, index) in dayHours"
          :key="index"
          class="absolute inset-x-0 border-t border-slate-200"
          :style="{ top: `${index * 80}px` }"
        />
        <button
          v-for="lesson in dayLessons"
          :key="lesson.id"
          type="button"
          class="absolute left-2 right-2 z-10 rounded border px-3 py-2 text-left text-xs shadow-sm transition hover:opacity-75"
          :class="statusClass(lesson.status)"
          :style="dayLessonStyle(lesson)"
          :title="`${lesson.title} / ${lesson.teacherName} / ${lesson.studentName}`"
          @click="emit('select', lesson)"
        >
          <span class="block truncate font-semibold"
            >{{ formatTime(lesson.scheduledStart, locale) }} {{ lesson.title }}</span
          >
          <span class="mt-1 block truncate text-[11px]">{{ lesson.studentName }} / {{ lesson.teacherName }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
