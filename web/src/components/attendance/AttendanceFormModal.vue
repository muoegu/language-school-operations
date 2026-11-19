<script setup lang="ts">
import { computed, shallowReactive, watch } from 'vue'
import { CalendarDate, Time } from '@internationalized/date'
import { useI18n } from 'vue-i18n'
import { attendanceFormSchema } from '../../validation/formSchemas'

export type AttendanceFormValues = {
  attendanceDate: string
  clockInAt: string | null
  clockOutAt: string | null
  status: 'present' | 'late' | 'absent'
  note: string | null
}

const props = defineProps<{
  open: boolean
  loading?: boolean
  errorMessage?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [values: AttendanceFormValues]
}>()

const { t } = useI18n()

const now = new Date()

const form = shallowReactive({
  attendanceDate: new CalendarDate(now.getFullYear(), now.getMonth() + 1, now.getDate()),
  clockIn: undefined as Time | undefined,
  clockOut: undefined as Time | undefined,
  status: 'present' as AttendanceFormValues['status'],
  note: '',
})

const statusOptions = computed(() => [
  { label: t('attendance.statuses.present'), value: 'present' },
  { label: t('attendance.statuses.late'), value: 'late' },
  { label: t('attendance.statuses.absent'), value: 'absent' },
])

const validationMessage = computed(() => {
  const result = attendanceFormSchema.safeParse({
    attendanceDate: form.attendanceDate?.toString() ?? '',
    clockInAt: null,
    clockOutAt: null,
    status: form.status,
    note: form.note,
  })
  if (!result.success) return t('attendance.dateRequired')
  if (form.clockIn && form.clockOut && form.clockIn.compare(form.clockOut) >= 0) return t('attendance.timeOrder')

  return ''
})

function resetForm() {
  const current = new Date()
  form.attendanceDate = new CalendarDate(current.getFullYear(), current.getMonth() + 1, current.getDate())
  form.clockIn = undefined
  form.clockOut = undefined
  form.status = 'present'
  form.note = ''
}

function toIso(value: Time | undefined) {
  if (!value) return null

  return new Date(
    form.attendanceDate.year,
    form.attendanceDate.month - 1,
    form.attendanceDate.day,
    value.hour,
    value.minute,
  ).toISOString()
}

function submit() {
  if (validationMessage.value) return
  emit('submit', {
    attendanceDate: form.attendanceDate.toString(),
    clockInAt: toIso(form.clockIn),
    clockOutAt: toIso(form.clockOut),
    status: form.status,
    note: form.note.trim() || null,
  })
}

watch(
  () => props.open,
  (open) => {
    if (open) resetForm()
  },
)
</script>

<template>
  <UModal
    :open="open"
    :title="t('attendance.createTitle')"
    :description="t('attendance.createDescription')"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <form class="flex flex-col gap-5" @submit.prevent="submit">
        <UFormField :label="t('attendance.date')" required>
          <UInputDate v-model="form.attendanceDate" locale="ja-JP" class="w-full" />
        </UFormField>
        <div class="grid gap-5 sm:grid-cols-2">
          <UFormField :label="t('attendance.start')">
            <UInputTime v-model="form.clockIn" locale="ja-JP" class="w-full" />
          </UFormField>
          <UFormField :label="t('attendance.end')">
            <UInputTime v-model="form.clockOut" locale="ja-JP" class="w-full" />
          </UFormField>
        </div>
        <UFormField :label="t('common.status')" required>
          <USelectMenu v-model="form.status" :items="statusOptions" value-key="value" class="w-full" />
        </UFormField>
        <UFormField :label="t('attendance.note')">
          <UTextarea v-model="form.note" :rows="3" class="w-full" />
        </UFormField>
        <UAlert
          v-if="validationMessage || errorMessage"
          color="error"
          :title="t('common.saveFailed')"
          :description="validationMessage || errorMessage"
        />
        <div class="flex justify-end gap-3">
          <UButton
            :label="t('common.cancel')"
            color="neutral"
            variant="outline"
            type="button"
            @click="emit('update:open', false)"
          />
          <UButton :label="t('common.save')" type="submit" :loading="loading" />
        </div>
      </form>
    </template>
  </UModal>
</template>
