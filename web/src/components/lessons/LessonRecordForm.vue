<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { CalendarDate, Time } from '@internationalized/date'
import { useI18n } from 'vue-i18n'

import type { LessonRecord } from '../../api/generated/types/LessonRecord'
import { lessonRecordFormSchema } from '../../validation/formSchemas'

export type LessonRecordInput = Pick<LessonRecord, 'id' | 'actualStart' | 'actualEnd' | 'note' | 'nextContent'>

export type LessonRecordFormValues = {
  outcome: 'completed' | 'absent' | 'cancelled'
  actualStart?: string | null
  actualEnd?: string | null
  note?: string | null
  nextContent?: string | null
}

const props = defineProps<{
  record: LessonRecordInput | null
  initialOutcome?: LessonRecordFormValues['outcome']
  loading?: boolean
  errorMessage?: string
  canRemove?: boolean
}>()

const emit = defineEmits<{
  submit: [values: LessonRecordFormValues]
  remove: []
}>()

const { t } = useI18n()

const form = reactive({
  outcome: 'completed' as LessonRecordFormValues['outcome'],
  // Nuxt UI's date input can resolve a separate copy of the date package.
  // Keep this UI boundary untyped rather than coupling form state to private class fields.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actualStartDate: undefined as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actualStartTime: undefined as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actualEndDate: undefined as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actualEndTime: undefined as any,
  note: '',
  nextContent: '',
})

const validationMessage = ref('')

const outcomeOptions = computed(() => [
  { label: t('lessonRecord.outcomes.completed'), value: 'completed' },
  { label: t('lessonRecord.outcomes.absent'), value: 'absent' },
  { label: t('lessonRecord.outcomes.cancelled'), value: 'cancelled' },
])

function toCalendarDate(value: string | null | undefined) {
  if (!value) return undefined
  const date = new Date(value)

  return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

function toTime(value: string | null | undefined) {
  if (!value) return undefined
  const date = new Date(value)

  return new Time(date.getHours(), date.getMinutes())
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toIsoString(date: any, time: any) {
  return new Date(date.year, date.month - 1, date.day, time.hour, time.minute).toISOString()
}

function resetForm() {
  form.outcome = props.initialOutcome ?? 'completed'
  form.actualStartDate = toCalendarDate(props.record?.actualStart)
  form.actualStartTime = toTime(props.record?.actualStart)
  form.actualEndDate = toCalendarDate(props.record?.actualEnd)
  form.actualEndTime = toTime(props.record?.actualEnd)
  form.note = props.record?.note ?? ''
  form.nextContent = props.record?.nextContent ?? ''
}

function submit() {
  validationMessage.value = ''
  const actualStart =
    form.actualStartDate && form.actualStartTime ? toIsoString(form.actualStartDate, form.actualStartTime) : null

  const actualEnd =
    form.actualEndDate && form.actualEndTime ? toIsoString(form.actualEndDate, form.actualEndTime) : null

  const result = lessonRecordFormSchema.safeParse({
    outcome: form.outcome,
    actualStart,
    actualEnd,
    note: form.note.trim() || null,
    nextContent: form.nextContent.trim() || null,
  })
  if (!result.success) {
    validationMessage.value = t('common.inputCheck')

    return
  }

  if (form.outcome === 'completed' && (!actualStart || !actualEnd)) {
    validationMessage.value = t('lessonRecord.completedTimeRequired')

    return
  }
  if (actualStart && actualEnd && new Date(actualStart) >= new Date(actualEnd)) {
    validationMessage.value = t('lessonRecord.endAfterStart')

    return
  }

  emit('submit', {
    outcome: form.outcome,
    actualStart,
    actualEnd,
    note: form.note.trim() || null,
    nextContent: form.nextContent.trim() || null,
  })
}

watch(() => [props.record, props.initialOutcome], resetForm, { immediate: true })
</script>

<template>
  <form class="flex flex-col gap-5" @submit.prevent="submit">
    <UFormField :label="t('lessonRecord.outcome')" required>
      <USelectMenu v-model="form.outcome" :items="outcomeOptions" value-key="value" class="w-full" />
    </UFormField>

    <div class="grid gap-5 sm:grid-cols-2">
      <UFormField :label="t('lessonRecord.actualStart')">
        <div class="grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
          <UInputDate v-model="form.actualStartDate" locale="ja-JP" class="w-full" />
          <UInputTime v-model="form.actualStartTime" locale="ja-JP" class="w-full" />
        </div>
      </UFormField>
      <UFormField :label="t('lessonRecord.actualEnd')">
        <div class="grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
          <UInputDate v-model="form.actualEndDate" locale="ja-JP" class="w-full" />
          <UInputTime v-model="form.actualEndTime" locale="ja-JP" class="w-full" />
        </div>
      </UFormField>
    </div>

    <UFormField :label="t('lessonRecord.note')">
      <UTextarea v-model="form.note" :rows="4" :placeholder="t('lessonRecord.notePlaceholder')" class="w-full" />
    </UFormField>
    <UFormField :label="t('lessonRecord.nextContent')">
      <UTextarea
        v-model="form.nextContent"
        :rows="4"
        :placeholder="t('lessonRecord.nextContentPlaceholder')"
        class="w-full"
      />
    </UFormField>

    <UAlert
      v-if="validationMessage || errorMessage"
      color="error"
      :title="t('common.saveFailed')"
      :description="validationMessage || errorMessage"
    />
    <div class="flex flex-wrap justify-end gap-3">
      <UButton
        v-if="record && canRemove !== false"
        :label="t('lessonRecord.delete')"
        color="error"
        variant="ghost"
        type="button"
        :disabled="loading"
        @click="emit('remove')"
      />
      <UButton :label="t('common.save')" type="submit" :loading="loading" />
    </div>
  </form>
</template>
