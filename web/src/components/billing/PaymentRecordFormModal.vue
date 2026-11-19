<script setup lang="ts">
import { computed, shallowReactive, watch } from 'vue'
import { CalendarDate } from '@internationalized/date'
import { useI18n } from 'vue-i18n'
import type { PaymentRecord } from '../../api/generated/types/PaymentRecord'
import { formatCurrency } from '../../utils/formatters'
import { paymentRecordFormSchema } from '../../validation/formSchemas'

export type PaymentRecordFormValues = {
  classId: string
  textbookIds: string[]
  dueDate: string | null
  status: PaymentRecord['status']
  paymentStatus: PaymentRecord['paymentStatus']
}

const props = defineProps<{
  open: boolean
  record: PaymentRecord | null
  classes: Array<{ id: string; name: string; priceMinor: number }>
  textbooks: Array<{ id: string; title: string; priceMinor: number }>
  loading?: boolean
  errorMessage?: string
}>()

const emit = defineEmits<{ 'update:open': [value: boolean]; submit: [values: PaymentRecordFormValues] }>()

const { t, locale } = useI18n()

const form = shallowReactive({
  classId: '',
  textbookIds: [] as string[],
  dueDate: undefined as CalendarDate | undefined,
  status: 'active' as PaymentRecord['status'],
  paymentStatus: 'paid' as PaymentRecord['paymentStatus'],
})

const classOptions = computed(() =>
  props.classes.map((item) => ({
    label: `${item.name} / ${formatCurrency(item.priceMinor, locale.value)}`,
    value: item.id,
  })),
)

const textbookOptions = computed(() =>
  props.textbooks.map((item) => ({
    label: `${item.title} / ${formatCurrency(item.priceMinor, locale.value)}`,
    value: item.id,
  })),
)

const statusOptions = computed(() =>
  ['active', 'used_up', 'expired', 'cancelled'].map((value) => ({
    label: t(`studentDetail.statuses.${value}`),
    value,
  })),
)

const paymentStatusOptions = computed(() =>
  ['unpaid', 'paid', 'refunded'].map((value) => ({ label: t(`studentDetail.statuses.${value}`), value })),
)

const validationMessage = computed(() => {
  const result = paymentRecordFormSchema.safeParse(form)

  return result.success ? '' : t('studentDetail.classRequired')
})

function toCalendarDate(value: string | null) {
  if (!value) return undefined
  const [year, month, day] = value.split('-').map(Number)

  return new CalendarDate(year, month, day)
}
function resetForm() {
  form.classId = props.record?.classId ?? props.classes[0]?.id ?? ''
  form.textbookIds = props.record?.textbooks.map((textbook) => textbook.id) ?? []
  form.dueDate = toCalendarDate(props.record?.dueDate ?? null)
  form.status = props.record?.status ?? 'active'
  form.paymentStatus = props.record?.paymentStatus ?? 'paid'
}
function submit() {
  if (validationMessage.value) return
  emit('submit', {
    classId: form.classId,
    textbookIds: form.textbookIds,
    dueDate: form.dueDate?.toString() ?? null,
    status: form.status,
    paymentStatus: form.paymentStatus,
  })
}
watch(() => [props.open, props.record], resetForm, { immediate: true })
</script>

<template>
  <UModal
    :open="open"
    :title="t('studentDetail.editPaymentTitle')"
    :description="t('studentDetail.editPaymentDescription')"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <form class="flex flex-col gap-5" @submit.prevent="submit">
        <UFormField :label="t('studentDetail.lessonType')" required :error="validationMessage || undefined"
          ><USelectMenu v-model="form.classId" :items="classOptions" value-key="value" class="w-full"
        /></UFormField>
        <UFormField :label="t('studentDetail.textbooks')"
          ><USelectMenu v-model="form.textbookIds" multiple :items="textbookOptions" value-key="value" class="w-full"
        /></UFormField>
        <UFormField :label="t('studentDetail.dueDate')"
          ><UInputDate v-model="form.dueDate" locale="ja-JP" class="w-full"
        /></UFormField>
        <div class="grid gap-5 sm:grid-cols-2">
          <UFormField :label="t('studentDetail.paymentStatus')"
            ><USelectMenu v-model="form.paymentStatus" :items="paymentStatusOptions" value-key="value" class="w-full"
          /></UFormField>
          <UFormField :label="t('studentDetail.ticketStatus')"
            ><USelectMenu v-model="form.status" :items="statusOptions" value-key="value" class="w-full"
          /></UFormField>
        </div>
        <UAlert v-if="errorMessage" color="error" :title="t('common.saveFailed')" :description="errorMessage" />
        <div class="flex justify-end gap-3">
          <UButton
            :label="t('common.cancel')"
            color="neutral"
            variant="outline"
            type="button"
            :disabled="loading"
            @click="emit('update:open', false)"
          /><UButton :label="t('common.save')" type="submit" :loading="loading" :disabled="loading" />
        </div>
      </form>
    </template>
  </UModal>
</template>
