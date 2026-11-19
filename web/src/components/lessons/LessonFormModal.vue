<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { CalendarDate, Time } from '@internationalized/date'

import type { Student } from '../../api/generated/types/Student'
import type { Teacher } from '../../api/generated/types/Teacher'
import type { Lesson } from '../../api/generated/types/Lesson'
import type { LessonType } from '../../api/generated/types/LessonType'
import { formatCurrency } from '../../utils/formatters'
import { lessonFormSchema } from '../../validation/formSchemas'

export type LessonFormValues = {
  classId: string
  teacherIds: string[]
  studentIds: string[]
  title: string
  level?: string
  scheduledStart: string
  scheduledEnd: string
}

const props = defineProps<{
  open: boolean
  lesson: Lesson | null
  teachers: Teacher[]
  teacherLocked?: boolean
  students: Student[]
  classes: LessonType[]
  loading?: boolean
  errorMessage?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [values: LessonFormValues]
}>()

const { t, locale } = useI18n()

const form = reactive({
  teacherIds: [] as string[],
  studentIds: [] as string[],
  classId: '',
  title: '',
  level: '',
  // Nuxt UI's date input can resolve a separate copy of the date package.
  // Keep this UI boundary untyped rather than coupling form state to private class fields.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scheduledStartDate: undefined as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scheduledStartTime: undefined as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scheduledEndDate: undefined as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scheduledEndTime: undefined as any,
})

const title = computed(() => (props.lesson ? t('lessons.editTitle') : t('lessons.createTitle')))

const description = computed(() => (props.lesson ? t('lessons.editDescription') : t('lessons.createDescription')))

const submitLabel = computed(() => (props.lesson ? t('common.save') : t('common.create')))

const validationMessage = computed(() => {
  const result = lessonFormSchema.safeParse({
    teacherIds: form.teacherIds,
    studentIds: form.studentIds,
    classId: form.classId,
    title: form.title,
    scheduledStart: form.scheduledStartDate && form.scheduledStartTime ? 'set' : '',
    scheduledEnd: form.scheduledEndDate && form.scheduledEndTime ? 'set' : '',
  })
  if (!result.success) {
    const path = result.error.issues[0]?.path[0]
    if (path === 'teacherIds') return t('lessons.teacherRequired')
    if (path === 'studentIds') return t('lessons.studentRequired')
    if (path === 'classId') return t('lessons.classRequired')
    if (path === 'title') return t('lessons.nameRequired')

    return t('lessons.dateRequired')
  }
  if (
    toIsoString(form.scheduledStartDate, form.scheduledStartTime) >=
    toIsoString(form.scheduledEndDate, form.scheduledEndTime)
  )
    return t('lessons.dateOrder')

  return ''
})

const teacherOptions = computed(() =>
  props.teachers.map((teacher) => ({ label: teacher.displayName, value: teacher.id })),
)

const studentOptions = computed(() =>
  props.students.map((student) => {
    const details = student.className

    return { label: details ? `${student.displayName}（${details}）` : student.displayName, value: student.id }
  }),
)

const classOptions = computed(() =>
  props.classes.map((classRow) => ({
    label: `${classRow.name} / ${formatCurrency(classRow.priceMinor, locale.value)}`,
    value: classRow.id,
  })),
)

function toCalendarDate(value: string | undefined) {
  if (!value) return undefined
  const date = new Date(value)

  return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

function toTime(value: string | undefined) {
  if (!value) return undefined
  const date = new Date(value)

  return new Time(date.getHours(), date.getMinutes())
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toIsoString(date: any, time: any) {
  return new Date(date.year, date.month - 1, date.day, time.hour, time.minute).toISOString()
}

function resetForm() {
  form.teacherIds = props.lesson?.teacherIds?.length
    ? [...props.lesson.teacherIds]
    : props.lesson?.teacherId
      ? [props.lesson.teacherId]
      : props.teacherLocked && props.teachers[0]?.id
        ? [props.teachers[0].id]
        : []
  form.studentIds = props.lesson?.studentIds?.length
    ? [...props.lesson.studentIds]
    : props.lesson?.studentId
      ? [props.lesson.studentId]
      : []
  form.classId = props.lesson?.classId ?? ''
  form.title = props.lesson?.title ?? ''
  form.level = props.lesson?.level ?? ''
  form.scheduledStartDate = toCalendarDate(props.lesson?.scheduledStart)
  form.scheduledStartTime = toTime(props.lesson?.scheduledStart)
  form.scheduledEndDate = toCalendarDate(props.lesson?.scheduledEnd)
  form.scheduledEndTime = toTime(props.lesson?.scheduledEnd)
}

function submit() {
  if (validationMessage.value) return
  emit('submit', {
    classId: form.classId,
    teacherIds: form.teacherIds,
    studentIds: form.studentIds,
    title: form.title.trim(),
    level: form.level.trim() || undefined,
    scheduledStart: toIsoString(form.scheduledStartDate!, form.scheduledStartTime!),
    scheduledEnd: toIsoString(form.scheduledEndDate!, form.scheduledEndTime!),
  })
}

watch(() => [props.open, props.lesson, props.teachers, props.teacherLocked], resetForm, { immediate: true })
</script>

<template>
  <UModal :open="open" :title="title" :description="description" @update:open="emit('update:open', $event)">
    <template #body>
      <form class="flex flex-col gap-5" @submit.prevent="submit">
        <UFormField :label="t('lessons.class')" required>
          <USelectMenu
            v-model="form.classId"
            :items="classOptions"
            value-key="value"
            :placeholder="t('lessons.selectClass')"
            class="w-full"
          />
        </UFormField>
        <div class="grid gap-5 sm:grid-cols-2">
          <UFormField :label="t('lessons.teacher')" required>
            <USelectMenu
              v-model="form.teacherIds"
              :items="teacherOptions"
              value-key="value"
              multiple
              :disabled="teacherLocked"
              :placeholder="t('lessons.selectTeacher')"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('lessons.student')" required>
            <USelectMenu
              v-model="form.studentIds"
              :items="studentOptions"
              value-key="value"
              multiple
              :placeholder="t('lessons.selectStudent')"
              class="w-full"
            />
          </UFormField>
        </div>
        <UFormField :label="t('lessons.name')" required>
          <UInput v-model="form.title" :placeholder="t('lessons.placeholderName')" class="w-full" />
        </UFormField>
        <UFormField :label="t('students.level')">
          <UInput v-model="form.level" :placeholder="t('lessons.placeholderLevel')" class="w-full" />
        </UFormField>
        <div class="grid gap-5 sm:grid-cols-2">
          <UFormField :label="t('lessons.dateTime')" required>
            <div class="grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
              <UInputDate v-model="form.scheduledStartDate" locale="ja-JP" class="w-full" />
              <UInputTime v-model="form.scheduledStartTime" locale="ja-JP" class="w-full" />
            </div>
          </UFormField>
          <UFormField :label="t('lessons.dateTime')" required>
            <div class="grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
              <UInputDate v-model="form.scheduledEndDate" locale="ja-JP" class="w-full" />
              <UInputTime v-model="form.scheduledEndTime" locale="ja-JP" class="w-full" />
            </div>
          </UFormField>
        </div>
        <p v-if="validationMessage" class="text-sm text-amber-700">{{ validationMessage }}</p>
        <UAlert v-if="errorMessage" color="error" :title="t('common.saveFailed')" :description="errorMessage" />
        <div class="flex justify-end gap-3">
          <UButton
            :label="t('common.cancel')"
            color="neutral"
            variant="outline"
            type="button"
            :disabled="loading"
            @click="emit('update:open', false)"
          />
          <UButton :label="submitLabel" type="submit" :loading="loading" />
        </div>
      </form>
    </template>
  </UModal>
</template>
